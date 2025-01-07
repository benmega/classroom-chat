# Installation Instructions

## Prerequisites
- Python 3.8+
- Flask and associated dependencies (see requirements.txt)
- PostgreSQL or SQLite

## Installation Steps
1. Clone the repository:
   ```bash
   git clone <<repository_url>>
   cd <<repository_directory>>

Create and activate a virtual environment:

python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Set up the database:

flask db init
flask db migrate
flask db upgrade

Run the development server:

flask run

Access the application at http://127.0.0.1:5000.