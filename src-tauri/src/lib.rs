use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::Manager;

/// Puerto en el que escucha el backend embebido cuando la app corre empaquetada.
/// En desarrollo el backend usa su propio backend/.env (por defecto 3000).
const EMBEDDED_BACKEND_PORT: u16 = 4577;

struct BackendProcess(Mutex<Option<Child>>);

#[derive(Serialize, Deserialize)]
struct LocalSecrets {
    jwt_secret: String,
    encryption_key: String,
}

fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Genera (una sola vez) y persiste el JWT_SECRET y la ENCRYPTION_KEY de esta
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
        encryption_key: random_hex(32),
    };

    let mut file = fs::File::create(&secrets_path)?;
    file.write_all(serde_json::to_string_pretty(&secrets)?.as_bytes())?;

    Ok(secrets)
}

/// Aplica las migraciones de Prisma pendientes contra la base de datos de esta
/// instalación. Se ejecuta en cada arranque, tanto en una instalación nueva
/// (recién copiada desde la plantilla, ya al día — no hace nada) como en una
/// ya existente que se actualiza a una versión con cambios de esquema.
/// Usa el CLI de `prisma` ya empaquetado en backend/node_modules, sin
/// depender de que el sistema tenga Node global fuera del que trae la app.
fn run_pending_migrations(
    backend_dir: &Path,
    db_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    let prisma_cli = backend_dir
        .join("node_modules")
        .join("prisma")
        .join("build")
        .join("index.js");
    let schema_path = backend_dir.join("prisma").join("schema.prisma");

    let output = Command::new("node")
        .arg(&prisma_cli)
        .arg("migrate")
        .arg("deploy")
        .arg(format!("--schema={}", schema_path.display()))
        .current_dir(backend_dir)
        .env("DATABASE_URL", format!("file:{}", db_path.display()))
        .output()?;

    if !output.status.success() {
        return Err(format!(
            "prisma migrate deploy falló ({}):\n{}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        )
        .into());
    }

    Ok(())
}

fn spawn_backend_dev() -> std::io::Result<Child> {
    // En desarrollo, backend/.env ya define DATABASE_URL (SQLite local) y un
    // JWT_SECRET de desarrollo — basta con levantar el backend tal cual.
    let backend_dir = std::env::current_dir()?.join("..").join("backend");

    Command::new("npm")
        .args(["run", "dev"])
        .current_dir(backend_dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
}

fn spawn_backend_release(app: &tauri::AppHandle) -> Result<Child, Box<dyn std::error::Error>> {
    let resource_dir = app.path().resource_dir()?;
    let backend_dir = resource_dir.join("backend");
    let server_entry = backend_dir.join("dist").join("server.js");

    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;

    // La base de datos de esta instalación vive en el directorio de datos del
    // usuario, no junto al binario, para que sobreviva a actualizaciones.
    let db_path = app_data_dir.join("formula-care.db");
    if !db_path.exists() {
        let template_db = backend_dir.join("prisma").join("desktop-template.db");
        fs::copy(&template_db, &db_path)?;
    }

    // Pone la base de datos al día con el esquema de esta versión. En una
    // instalación recién creada (plantilla ya migrada) esto es un no-op; en
    // una actualización, aplica las migraciones nuevas. Si falla, se deja
    // constancia en un log y se intenta arrancar igualmente: es preferible
    // que la app abra (aunque falle alguna petición) a que no abra en
    // absoluto por un problema de migración que el usuario no puede depurar.
    if let Err(e) = run_pending_migrations(&backend_dir, &db_path) {
        let log_path = app_data_dir.join("migrate-error.log");
        let _ = fs::write(&log_path, format!("{}\n", e));
        eprintln!("⚠️  Error aplicando migraciones (ver {}): {}", log_path.display(), e);
    }

    let secrets = ensure_local_secrets(&app_data_dir)?;

    let child = Command::new("node")
        .arg(&server_entry)
        .current_dir(&backend_dir)
        .env("NODE_ENV", "production")
        .env("PORT", EMBEDDED_BACKEND_PORT.to_string())
        .env("DATABASE_URL", format!("file:{}", db_path.display()))
        .env("JWT_SECRET", secrets.jwt_secret)
        .env("ENCRYPTION_KEY", secrets.encryption_key)
        .env("CORS_ORIGIN", "tauri://localhost,http://tauri.localhost")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?;

    Ok(child)
}

fn kill_backend(app: &tauri::AppHandle) {
    let state = app.state::<BackendProcess>();
    let taken = state.0.lock().unwrap().take();
    if let Some(mut child) = taken {
        let _ = child.kill();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                spawn_backend_dev()?
            } else {
                spawn_backend_release(app.handle())?
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
