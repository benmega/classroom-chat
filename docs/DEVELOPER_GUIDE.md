# Developer Guide

## Project Structure

### High-Level Overview:
├── backend/
│   └── application/      # Flask app code
│       ├── ai/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── extensions.py
│       └── config.py
├── docs/                # Documentation files
├── frontend/            # Vite + React SPA
│   ├── src/             # Source code
│   └── public/          # Static assets
├── userData/            # Uploaded user assets
└── ... (other support files)


### Detailed Project Structure:
The repository follows a clear layout:
```text
classroom-chat/
├── backend/
│   └── application/      # Flask application
│       ├── ai/            # AI services
│       ├── models/        # SQLAlchemy models
│       ├── routes/        # Flask blueprints
│       ├── services/      # Business logic
│       ├── extensions.py  # Shared extensions
│       └── config.py      # Configuration
├── docs/                # Documentation
├── frontend/            # Vite + React SPA
│   ├── src/             # Source code
│   └── public/          # Static assets
├── userData/            # Uploaded user assets
└── ... (other support files)
```  
  - **Application Directory**:  
    - Core app logic divided into modules: `api/`, `models/`, `routes/`, `utilities/`, etc.  
  - **Static and Templates**:  
    - Static files (CSS, JS, images) and HTML templates.  
  - **Instance Folder**:  
    - Contains SQLite database files and utility scripts.  
  - **Tests**:  
    - Unit tests for the project.  
  - **UserData**:  
    - User-related files, images, and other assets.

#### 2. **Docs Directory**  
Stores documentation files like:
- `API.md` - API details.
- `DEVELOPER_GUIDE.md` - This guide.
- `INSTALLATION.md` - Setup instructions.

#### 3. **Tests Directory**  
Includes:
- `.pytest_cache/` - Cached test data.  
- `test_app.py` - Unit tests for the app.

---

## Coding Standards

- Follow **PEP 8** guidelines for Python code.
- Use meaningful and descriptive variable and function names.
- Maintain clean and modular code.

---

## Branching Strategy

- Create **feature branches** for new functionality (e.g., `feature/ducks`).  
- Ensure all code changes are thoroughly tested before merging into `main`.  
- Resolve merge conflicts and rebase when necessary.  

---

## Testing

- Write unit tests for all new features and ensure existing tests pass.  
- Run tests before submitting pull requests:  
  ```bash
  pytest ../tests/

## Contributing
Fork the repository: Create your own copy of the repository.
Feature Development: Work on a new feature branch.
Submit Pull Requests: Provide a clear description of changes made.
Contact
For questions, suggestions, or feedback, contact:
<<maintainer_email>>

Additional Notes:
- Keep your branches synchronized with the main repository.
- Add clear and concise documentation for all new features or changes.
- Use meaningful commit messages to explain the reasoning behind each change.

Front-end notes:
- Flash messages (Bootstrap toasts) are positioned in the bottom-right of the viewport to avoid overlaying header/profile icons; see `templates/base.html` and `static/css/base.css` for implementation details.





