import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PLACEHOLDER = "Summary: Python module summary."

def summarize(path: Path) -> str:
    """Return a brief, human-readable summary based on file location/name."""
    name = path.stem
    ext = path.suffix.lstrip(".")
    parts = path.relative_to(ROOT).parts

    def nice(label: str) -> str:
        return label.replace("_", " ").replace("-", " ").strip()

    # ---- tests/ ----
    if parts[0] == "tests":
        if "routes" in parts:
            target = name.removeprefix("test_")
            return f"Unit tests for {nice(target)} Flask routes."
        if "models" in parts:
            target = name.removeprefix("test_")
            return f"Unit tests for {nice(target)} model."
        if name.startswith("test_"):
            return f"Unit tests for {nice(name.removeprefix('test_'))}."
        if name == "conftest":
            return "Pytest configuration and fixtures for the test suite."
        return "Test module for application behavior."

    # ---- application/ Python ----
    if parts[0] == "application":
        if "routes" in parts:
            if name == "__init__":
                return "Blueprint registration for application route modules."
            return f"Flask routes for {nice(name)} functionality."
        if "models" in parts:
            if name == "__init__":
                return "Model import helper to register all SQLAlchemy models."
            if name == "user":
                return "SQLAlchemy model for application users and authentication data."
            if name == "conversation":
                return "SQLAlchemy model for chat conversations and relationships."
            if name == "message":
                return "SQLAlchemy model for chat messages and metadata."
            if name == "challenge":
                return "SQLAlchemy model for coding challenges and rewards."
            if name == "challenge_log":
                return "SQLAlchemy model for logging completed challenges."
            if name == "configuration":
                return "SQLAlchemy model for global configuration and feature flags."
            if name == "ai_settings":
                return "SQLAlchemy model for AI teacher-related settings."
            if name == "achievements":
                return "SQLAlchemy model for achievement definitions and metadata."
            if name == "banned_words":
                return "SQLAlchemy model for banned words used in moderation."
            if name == "duck_trade":
                return "SQLAlchemy model for duck trade logs and statuses."
            if name == "skill":
                return "SQLAlchemy model for user skills and tagging."
            if name == "project":
                return "SQLAlchemy model for user projects and portfolio items."
            if name == "course":
                return "SQLAlchemy model for course information and mapping."
            if name == "session_log":
                return "SQLAlchemy model for logging user sessions and activity."
            if name == "user_certificate":
                return "SQLAlchemy model for user-submitted certificates."
            return f"SQLAlchemy model definitions for {nice(name)}."
        if "utilities" in parts:
            if name == "__init__":
                return "Utility package initialization for database and helpers."
            if name == "db_helpers":
                return "Database helper functions for users, messages, and conversations."
            if name == "helper_functions":
                return "General utility helpers for file uploads and database commits."
            if name == "session_cleanup":
                return "Session cleanup utilities for closing stale user sessions."
            return f"Utility helpers for {nice(name)}."
        if "ai" in parts:
            if name == "__init__":
                return "AI module initialization for teacher-related features."
            if name == "ai_teacher":
                return "AI teacher logic for generating responses and managing sessions."
            return f"AI-related helpers for {nice(name)}."
        if name == "__init__":
            return "Flask application factory and core app initialization."
        if name == "extensions":
            return "Flask extension instances (DB, SocketIO, limiter, scheduler)."
        if name == "tasks":
            return "Background scheduler tasks for periodic session cleanup."
        if name == "socket_events":
            return "Socket.IO event handlers for user connections and status changes."
        if name == "config":
            return "Configuration classes and settings for different environments."
        if name == "license_checker":
            return "Helpers for validating and loading license data at startup."
        if name == "generate_keys":
            return "Utility for generating license keys and cryptographic material."
        if name == "generate_license":
            return "Utility for generating and signing license files."
        return f"Application module for {nice(name)}."

    # ---- top-level Python files ----
    if ext == "py":
        if name == "main":
            return "Entry point for starting the Flask application."
        if name == "wrapper":
            return "Helper wrapper for running the application in different contexts."
        if name == "meta":
            return "Project metadata utilities and helper functions."
        return f"Python module {nice(name)}."

    # ---- static/js ----
    if parts[0] == "static" and ext == "js":
        if "messages" in parts:
            if name == "chat":
                return "Client-side chat input handling and submit-on-enter behavior."
            if name == "messageHandling":
                return "Client-side messaging logic, conversation refresh, and file uploads."
        if "sockets" in parts:
            if name == "socketLogic":
                return "Socket.IO client bootstrap and connection utilities."
            if name == "socketManager":
                return "Client-side helpers for managing socket events and state."
        if "ducks" in parts:
            return "Duck trade UI logic for validating and submitting duck trades."
        if "admin" in parts:
            if name == "admin":
                return "Admin panel client-side actions for toggles, users, and trades."
            if name == "password-manager":
                return "Admin UI for password strength indication and resets."
            if name == "duck-stats":
                return "Client-side helpers for displaying duck trade statistics."
        if "users" in parts:
            if name == "profile":
                return "Profile picture cropping, preview, and upload handling."
            if name == "edit_profile":
                return "Client-side logic for editing user profile details."
            if name == "usernameLogic":
                return "Client-side helpers for username and password modal workflows."
        if name == "main":
            return "Main frontend bootstrap for sockets, chat, and achievements."
        if name == "config":
            return "Client-side configuration values for server communication."
        return f"Client-side JavaScript for {nice(name)}."

    # ---- static/css ----
    if parts[0] == "static" and ext == "css":
        if name == "base":
            return "Global layout, header, navigation, and typography styling."
        if name == "message":
            return "Styling for chat message bubbles and conversation layout."
        if name == "login":
            return "Login page layout and form styling."
        if name == "signup":
            return "Signup page layout and form styling."
        if name == "bit_shift":
            return "Styling for the duck trading bit/byte conversion interface."
        if name == "achievements":
            return "Styling for achievements page and badge display."
        if name == "conversation_history":
            return "Styling for conversation history list views."
        if name == "view_conversation":
            return "Styling for single conversation detail view."
        if name == "profile":
            return "User profile page layout and styling."
        if name == "edit_profile":
            return "Styling for editing user profile sections and forms."
        if name == "profile_picture_modal":
            return "Styling for the profile picture cropping modal dialog."
        if name == "submit_challenge":
            return "Styling for the challenge submission page."
        if name == "submit_certificate":
            return "Styling for the certificate submission page."
        if name == "variables":
            return "CSS custom properties for colors, spacing, and typography."
        if name == "sprite":
            return "Sprite sheet positioning and icon display utilities."
        if name == "admin":
            return "Admin dashboard layout and control styling."
        if name == "bit_pond":
            return "Styling for the Bit Pond themed visual interface."
        return f"CSS styles for {nice(name)}."

    # ---- templates (HTML) ----
    if parts[0] == "templates" and ext == "html":
        if name == "base":
            return "Base layout template with header, navigation, and toast messages."
        if name == "index":
            return "Main classroom chat landing and conversation page template."
        if "auth" in parts:
            if name == "login":
                return "Login page template for user authentication."
            if name == "signup":
                return "Signup page template for creating new accounts."
            if name == "add_achievements":
                return "Template for adding achievements through the UI."
        if "user" in parts:
            if name == "profile":
                return "User profile page template showing stats and achievements."
            if name == "edit_profile":
                return "Template for editing user profile info, skills, and projects."
        if "chat" in parts:
            if name == "conversation_history":
                return "Template listing conversations a user has participated in."
            if name == "view_conversation":
                return "Template for viewing a single conversation and its messages."
        if "admin" in parts:
            if name == "admin":
                return "Admin dashboard overview template with stats and controls."
            if name == "admin_base":
                return "Base template for admin pages and Flask-Admin integration."
            if name == "advanced_panel":
                return "Advanced admin panel landing page template."
            if name == "admin_documents":
                return "Admin template for managing uploaded documents."
            if name == "admin_certificates":
                return "Admin template for reviewing submitted certificates."
            if name == "add_achievement":
                return "Admin form template for creating new achievements."
            if name == "pending_trades":
                return "Admin template listing pending duck trade requests."
            if name == "trades":
                return "Admin trades overview and management template."
            if "advanced_panel" in parts:
                return "Master template used by the advanced admin interface."
        if "fallback" in parts:
            return "Fallback landing page when the main app is unavailable."
        if name == "submit_challenge":
            return "Challenge submission template for CodeCombat/Ozaria links."
        if name == "submit_certificate":
            return "Template for submitting certificates as achievements."
        if name == "bit_shift":
            return "Duck trading (bit shift) interface page template."
        if name == "achievements":
            return "Template for displaying user achievements and badges."
        return f"HTML template for {nice(name)}."

    # ---- fallback for anything else ----
    return f"{ext} file for {nice(name)}."

def update_file(path: Path) -> bool:
    """Replace placeholder summary in one file. Return True if modified."""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return False

    if PLACEHOLDER not in text:
        return False

    summary = summarize(path)
    # Replace the exact placeholder line "Summary: [Brief description here]"
    # with a custom, file-specific summary.
    new_text = text.replace(PLACEHOLDER, f"Summary: {summary}", 1)
    if new_text == text:
        return False

    path.write_text(new_text, encoding="utf-8")
    return True

def main():
    modified = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [
            d for d in dirnames
            if d not in {"venv", ".git", "__pycache__", "instance", "userData", ".pytest_cache"}
        ]
        for filename in filenames:
            # Only touch files that are likely to have headers
            if not any(filename.endswith(ext) for ext in (".py", ".js", ".ts", ".html", ".css")):
                continue
            path = Path(dirpath) / filename
            if update_file(path):
                modified.append(str(path.relative_to(ROOT)))

    print("Updated summaries in files:")
    for m in modified:
        print("  -", m)

if __name__ == "__main__":
    main()