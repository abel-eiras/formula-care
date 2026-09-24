use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;

use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Puerto en el que escucha el backend embebido cuando la app corre empaquetada.
/// En desarrollo el backend usa su propio backend/.env (por defecto 3000).
const EMBEDDED_BACKEND_PORT: u16 = 4577;

/// En desarrollo el backend se lanza con `npm run dev` (usa el Node.js del
/// sistema, como el resto de herramientas de desarrollo). En producción se
/// lanza con el runtime de Node.js empaquetado como sidecar (ver
/// `spawn_backend_release`), para no depender de que el usuario final tenga
/// Node.js instalado.
enum BackendChild {
    Dev(std::process::Child),
    Sidecar(CommandChild),
}

impl BackendChild {
    fn kill(self) {
        match self {
            BackendChild::Dev(mut child) => {
                let _ = child.kill();
            }
            BackendChild::Sidecar(child) => {
                let _ = child.kill();
            }
        }
    }
}

struct BackendProcess(Mutex<Option<BackendChild>>);

// Las instalaciones antiguas pueden tener también "encryption_key" en
// secrets.json (cifrado de campos ya retirado): serde ignora campos desconocidos.
#[derive(Serialize, Deserialize)]
struct LocalSecrets {
    jwt_secret: String,
}

fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Genera (una sola vez) y persiste el JWT_SECRET de esta
/// instalación en el directorio de datos de la app, para que sobrevivan a
/// reinicios y actualizaciones sin quedar hardcodeados en el binario.
fn ensure_local_secrets(app_data_dir: &Path) -> std::io::Result<LocalSecrets> {
    let secrets_path = app_data_dir.join("secrets.json");

    if secrets_path.exists() {
        let raw = fs::read_to_string(&secrets_path)?;
        if let Ok(secrets) = serde_json::from_str::<LocalSecrets>(&raw) {
            return Ok(secrets);
        }
    }

    let secrets = LocalSecrets {
        jwt_secret: random_hex(32),
    };

    let mut file = fs::File::create(&secrets_path)?;
    file.write_all(serde_json::to_string_pretty(&secrets)?.as_bytes())?;

    Ok(secrets)
}

/// Aplica las migraciones de Prisma pendientes contra la base de datos de esta
/// instalación. Se ejecuta en cada arranque, tanto en una instalación nueva
/// (recién copiada desde la plantilla, ya al día — no hace nada) como en una
/// ya existente que se actualiza a una versión con cambios de esquema.
/// Usa el CLI de `prisma` ya empaquetado en backend/node_modules, ejecutado
/// con el runtime de Node.js empaquetado como sidecar (no requiere Node.js
/// instalado en el sistema del usuario final).
fn run_pending_migrations(
    app: &tauri::AppHandle,
    backend_dir: &Path,
    db_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let prisma_cli = backend_dir
        .join("node_modules")
        .join("prisma")
        .join("build")
        .join("index.js");
    let schema_path = backend_dir.join("prisma").join("schema.prisma");

    let (mut rx, _child) = app
        .shell()
        .sidecar("node")?
        .arg(&prisma_cli)
        .arg("migrate")
        .arg("deploy")
        .arg(format!("--schema={}", schema_path.display()))
        .current_dir(backend_dir)
        .env("DATABASE_URL", format!("file:{}", db_path.display()))
        .spawn()?;

    let mut stderr = String::new();
    let mut exit_code: Option<i32> = None;
    while let Some(event) = rx.blocking_recv() {
        match event {
            CommandEvent::Stderr(bytes) => stderr.push_str(&String::from_utf8_lossy(&bytes)),
            CommandEvent::Terminated(payload) => exit_code = payload.code,
            _ => {}
        }
    }

    if exit_code != Some(0) {
        return Err(format!(
            "prisma migrate deploy falló (código {:?}):\n{}",
            exit_code, stderr
        )
        .into());
    }

    Ok(())
}

/// Guarda una copia de la base de datos antes de migrarla a una versión nueva
/// de la app. Si la migración saliera mal, los datos anteriores siguen ahí
/// (se puede restaurar desde Configuración → Copias de seguridad → Importar).
/// Solo copia cuando cambia la versión; devuelve la ruta de la copia.
fn copia_antes_de_actualizar(
    app_data_dir: &Path,
    db_path: &Path,
    version_actual: &str,
) -> std::io::Result<Option<std::path::PathBuf>> {
    let fichero_version = app_data_dir.join("ultima-version.txt");
    let version_anterior = fs::read_to_string(&fichero_version)
        .map(|v| v.trim().to_string())
        .unwrap_or_default();

    let mut copia = None;
    if version_anterior != version_actual && db_path.exists() {
        let carpeta = app_data_dir.join("copias-actualizacion");
        fs::create_dir_all(&carpeta)?;
        let origen = if version_anterior.is_empty() { "anterior" } else { &version_anterior };
        let destino = carpeta.join(format!("formula-care-{}-antes-de-{}.db", origen, version_actual));
        fs::copy(db_path, &destino)?;
        copia = Some(destino);
    }
    fs::write(&fichero_version, version_actual)?;
    Ok(copia)
}

fn spawn_backend_dev() -> std::io::Result<std::process::Child> {
    // En desarrollo, backend/.env ya define DATABASE_URL (SQLite local) y un
    // JWT_SECRET de desarrollo — basta con levantar el backend tal cual con
    // el Node.js del sistema (igual que el resto de las herramientas de dev).
    let backend_dir = std::env::current_dir()?.join("..").join("backend");

    Command::new("npm")
        .args(["run", "dev"])
        .current_dir(backend_dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
}

fn spawn_backend_release(
    app: &tauri::AppHandle,
) -> Result<CommandChild, Box<dyn std::error::Error>> {
    let resource_dir = app.path().resource_dir()?;
    let backend_dir = resource_dir.join("backend");
    let server_entry = backend_dir.join("dist").join("server.js");

    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;

    // La base de datos de esta instalación vive en el directorio de datos del
    // usuario, no junto al binario, para que sobreviva a actualizaciones.
    let db_path = app_data_dir.join("formula-care.db");
    let instalacion_nueva = !db_path.exists();
    if instalacion_nueva {
        let template_db = backend_dir.join("prisma").join("desktop-template.db");
        fs::copy(&template_db, &db_path)?;
    }

    let version = app.package_info().version.to_string();
    let copia = if instalacion_nueva {
        // Nada que proteger: solo se anota la versión
        let _ = fs::write(app_data_dir.join("ultima-version.txt"), &version);
        None
    } else {
        copia_antes_de_actualizar(&app_data_dir, &db_path, &version).unwrap_or_else(|e| {
            eprintln!("⚠️  No se pudo copiar la base de datos antes de actualizar: {}", e);
            None
        })
    };

    // Pone la base de datos al día con el esquema de esta versión. En una
    // instalación recién creada (plantilla ya migrada) esto es un no-op; en
    // una actualización, aplica las migraciones nuevas. Si falla, se deja
    // constancia en un log y se intenta arrancar igualmente: es preferible
    // que la app abra (aunque falle alguna petición) a que no abra en
    // absoluto por un problema de migración que el usuario no puede depurar.
    if let Err(e) = run_pending_migrations(app, &backend_dir, &db_path) {
        let log_path = app_data_dir.join("migrate-error.log");
        let _ = fs::write(&log_path, format!("{}\n", e));
        eprintln!(
            "⚠️  Error aplicando migraciones (ver {}): {}",
            log_path.display(),
            e
        );
        // Aviso visible: sin él, la app abriría y fallarían peticiones sin explicación
        let copia_txt = copia
            .as_ref()
            .map(|c| format!("\n\nTus datos anteriores están a salvo en:\n{}", c.display()))
            .unwrap_or_default();
        app.dialog()
            .message(format!(
                "No se ha podido actualizar la base de datos a esta versión. Algunas pantallas pueden fallar.{}\n\nDetalle del error en:\n{}",
                copia_txt,
                log_path.display()
            ))
            .title("Formula Care: error al actualizar")
            .kind(MessageDialogKind::Error)
            .show(|_| {});
    }

    let secrets = ensure_local_secrets(&app_data_dir)?;

    let (mut rx, child) = app
        .shell()
        .sidecar("node")?
        .arg(&server_entry)
        .current_dir(&backend_dir)
        .env("NODE_ENV", "production")
        .env("PORT", EMBEDDED_BACKEND_PORT.to_string())
        .env("DATABASE_URL", format!("file:{}", db_path.display()))
        .env("JWT_SECRET", secrets.jwt_secret)
        .env("CORS_ORIGIN", "tauri://localhost,http://tauri.localhost")
        // El backend comprueba este PID y se cierra si la app ya no existe
        // (cierre forzoso o caída): así no queda ocupando el puerto
        .env("PID_APP", std::process::id().to_string())
        // Se guarda en las copias de seguridad (para avisar si se restauran en una versión antigua)
        .env("APP_VERSION", &version)
        .spawn()?;

    // Reenvía stdout/stderr del backend a la salida de la app (equivalente al
    // Stdio::inherit() que se usaba con std::process::Command).
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => print!("{}", String::from_utf8_lossy(&bytes)),
                CommandEvent::Stderr(bytes) => eprint!("{}", String::from_utf8_lossy(&bytes)),
                _ => {}
            }
        }
    });

    Ok(child)
}

fn kill_backend(app: &tauri::AppHandle) {
    let state = app.state::<BackendProcess>();
    let taken = state.0.lock().unwrap().take();
    if let Some(child) = taken {
        child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Debe ser el primer plugin: si la app ya está abierta, la segunda
    // apertura solo enfoca la ventana existente (dos backends chocarían en el puerto)
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(ventana) = app.get_webview_window("main") {
            let _ = ventana.unminimize();
            let _ = ventana.show();
            let _ = ventana.set_focus();
        }
    }));

    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let child = if cfg!(debug_assertions) {
                BackendChild::Dev(spawn_backend_dev()?)
            } else {
                BackendChild::Sidecar(spawn_backend_release(app.handle())?)
            };

            app.state::<BackendProcess>()
                .0
                .lock()
                .unwrap()
                .replace(child);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                kill_backend(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
