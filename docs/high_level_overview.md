# High-Level Project Overview - Classroom Chat

Classroom Chat is a full-stack educational community platform designed to facilitate interaction, gamification, and project showcasing for students. This document provides the absolute "30,000-foot view" of how the parts interconnect.

## 1. The Core Experience
At its heart, Classroom Chat is a **Gamified Social Learning Environment**. Students participate in external coding platforms (like CodeCombat or Ozaria), and their progress is tracked and rewarded within this ecosystem using "Ducks" (virtual currency) and Achievements.

---

## 2. Integrated Systems
The project is more than just a chat app; it is an integration of several specialized systems:

### 2.1 The Dashboard & Portfolio
- Provides a centralized view of student progress.
- Includes a "GitHub-style" contribution graph based on challenge activity.
- Allows students to showcase their coding projects and earned skills.

### 2.2 The Real-Time Chat
- Enables peer-to-peer and group communication.
- Features an "AI Teacher" assistant that can participate in conversations to provide educational support.

### 2.3 The Admin Engine
- A powerful backend for educators to manage user accounts, approve submissions, moderate content, and control global system settings (e.g., multipliers for currency rewards).

---

## 3. Communication Flow
1. **Frontend (React)**: Captures user interaction and state.
2. **Real-time (Socket.io)**: Bridges the client and server for instant updates.
3. **Backend (Flask)**: Processes business logic, validates security, and manages permissions.
4. **Persistence (SQLite/SQLAlchemy)**: Stores the long-term history of the community.
5. **AI (OpenAI)**: Adds an intelligent layer to messaging and feedback.

---

## 4. Why This Architecture?
- **Separation of Concerns**: By decoupled the frontend (Vite/React) and backend (Flask API), the project ensures scalability and allows for independent updates to the UI or Business Logic.
- **Security First**: All operations go through a centralized API layer with robust rate-limiting and CSRF protection.
- **Extensibility**: The Blueprint system on the backend and Component structure on the frontend make adding new features (like a new gamification mechanic) straightforward.
