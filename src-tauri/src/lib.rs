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
