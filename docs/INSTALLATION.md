# Classroom Chat and Duck System

![Demo Screenshot](assets/demo_screenshot.png)

## Prerequisites
- Python 3.8+
- Flask and associated dependencies (see requirements.txt)
- PostgreSQL or SQLite

## Installation Steps
1. Clone the repository:
   ```bash
   git clone <<repository_url>>
   cd <<repository_directory>>
   ```

Create and activate a virtual environment:

python3 -m venv venv
# Activate the virtual environment
# On Unix/macOS:
source venv/bin/activate
# On Windows PowerShell:
.\\venv\\Scripts\\Activate.ps1
# On Windows Command Prompt:
.\\venv\\Scripts\\activate.bat

Install dependencies:

pip install -r requirements.txt

## Getting Started

To start the application locally, you need to run both the backend (Flask) and the frontend (Vite) servers.

Set up the database:

flask db init
flask db migrate
flask db upgrade

# Run the backend development server:
flask run

# In a new terminal, run the frontend dev server (Vite):
cd frontend
npm run dev -- --host

Access the application at http://127.0.0.1:8000.

## API Documentation
### Main REST API Endpoints