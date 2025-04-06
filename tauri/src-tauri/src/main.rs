// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::thread;

// The command that will be called from JavaScript
#[tauri::command]
fn run_flask_app() -> Result<String, String> {
    // Start the Flask app in a new thread to avoid blocking the UI
    thread::spawn(|| {
        // Run main.py instead of app.py
        let output = Command::new("python")
            .args(["main.py"])  // Change to python3 if on Linux/Mac
            .spawn();

        match output {
            Ok(_) => println!("Flask server started successfully on http://127.0.0.1:5000"),
            Err(e) => eprintln!("Failed to start Flask server: {}", e),
        }
    });

    // Return success message
    Ok("Flask server started at http://127.0.0.1:5000".to_string())
}

fn main() {
    tauri::Builder::default()
        // Register the command we defined above
        .invoke_handler(tauri::generate_handler![run_flask_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}