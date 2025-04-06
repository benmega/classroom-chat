// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// main.rs – Rust Tauri launcher for Flask
use std::process::{Command, Child};
use std::sync::Mutex;
use std::path::PathBuf;
use std::env;
use tauri::{Manager, WindowEvent};

struct ServerState(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .manage(ServerState(Mutex::new(None)))
        .setup(|app| {
            // Get the base directory
            let base_dir = match env::current_dir() {
                Ok(path) => path,
                Err(_) => PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            };

            // Navigate to parent directory as mentioned in the original code
            let app_path = base_dir.parent().unwrap_or(&base_dir).to_path_buf();

            // Create the path to main.py
            let flask_script_path = app_path.join("../main.py");

            println!("Starting Flask server with script at: {:?}", flask_script_path);

            // Start Flask server with absolute path
            let server = Command::new("python")
                .arg(&flask_script_path)
                .current_dir(&app_path) // Use absolute path as working directory
                .spawn()
                .expect("Failed to start Flask server");

            let state = app.state::<ServerState>();
            *state.0.lock().unwrap() = Some(server);

            Ok(())
        })
        .on_window_event(|event_app, event| {
            // Gracefully stop Flask server when window closes
            if let WindowEvent::CloseRequested { api: _, .. } = event {
                let window = event_app.get_webview_window("main").unwrap();
                let state = window.state::<ServerState>();
                if let Some(mut child) = state.0.lock().unwrap().take() {
                    println!("Shutting down Flask server...");
                    let _ = child.kill();
                };
            }
        })
        .run(tauri::generate_context!())
        .expect("Tauri application failed");
}