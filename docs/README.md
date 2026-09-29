# Classroom Chat and Duck System

## Overview
Classroom Chat is a web-based application designed to enhance student interaction and engagement during class. It features real-time chat, challenge tracking, and a gamified reward system called "Ducks." Students earn ducks by completing challenges; ducks and achievements appear on their profiles.

## Core Features
- **Real-Time Chat:** Socket.IO based chat scoped to classrooms.
- **Challenge System:** Track challenges (for example CodeCombat and Ozaria) with point values.
- **Duck Rewards:** Gamified currency, duck trading and achievements.
- **Profiles and Portfolio:** Projects, skills, certificates and earned achievements.
- **Admin Panel:** User approval, moderation, duck adjustments, certificate and project review.
- **Educational Design:** Intentional "thinking in binary" philosophy (see [EDUCATIONAL_DESIGN.md](EDUCATIONAL_DESIGN.md)).

## Quick Start

Full instructions are in [INSTALLATION.md](INSTALLATION.md). In short:

```bash
# Backend (port 8000)
python -m venv venv && source venv/bin/activate     # Windows: .\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
cd backend && python main.py

# Frontend (port 5173), in another terminal
cd frontend && npm install && npm run dev
```

Open http://localhost:5173.

## Key Technologies
- Flask, Flask-SocketIO (gevent) and SQLAlchemy (backend)
- React 19, Vite, react-router-dom, Zustand, TanStack Query and react-admin (frontend)
- SQLite database; Alembic migrations

## Documentation Index
- [INSTALLATION.md](INSTALLATION.md): local setup
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md): repository layout and workflow
- [api_reference.md](api_reference.md): backend routes and Socket.IO events
- [route_map.md](route_map.md): frontend routes and key backend endpoints
- [database_schema.md](database_schema.md), [backend_design.md](backend_design.md), [frontend_design.md](frontend_design.md)
- [infrastructure_and_devops.md](infrastructure_and_devops.md): deployment
- [testing_and_qa.md](testing_and_qa.md), [issue_resolver_guide.md](issue_resolver_guide.md), [agentic_workflows.md](agentic_workflows.md)
