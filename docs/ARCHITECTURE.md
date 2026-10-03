# System Architecture - Classroom Chat

This document provides a comprehensive overview of the system architecture for **Classroom Chat**, detailing its components, their interactions, data flows, and the underlying infrastructure.

## Architectural Diagram

The following Mermaid diagram illustrates the high-level architecture of the system:

```mermaid
flowchart TB
    %% External Users
    subgraph Users ["Users"]
        Student([Student])
        Teacher([Teacher/Admin])
        Parent([Parent])
    end

    %% External Services
    subgraph ExternalServices ["External Services"]
        OpenAI[("OpenAI API\n(AI Teacher)")]
        Cognito[("AWS Cognito\n(SSO Auth)")]
        ExternalPlatforms[("External Coding Platforms\n(CodeCombat, Ozaria)")]
    end

    %% Infrastructure - AWS S3 & CloudFront
    subgraph AWSEdge ["AWS CloudFront & S3 (Frontend)"]
        CloudFront["CloudFront CDN\n(blossom.benmega.com)"]
        S3Bucket[("S3 Bucket\n(Static Assets)")]
        
        subgraph Frontend ["Frontend (React SPA)"]
            React["React 19 Application"]
            State["Zustand & React Query"]
            SocketClient["Socket.io Client"]
            Axios["Axios API Client"]
            React --- State
            React --- SocketClient
            React --- Axios
        end
        
        CloudFront -->|Fetches Assets| S3Bucket
    end

    %% Infrastructure - AWS EC2
    subgraph EC2 ["AWS EC2 Instance (Backend)"]
        Nginx["Nginx Reverse Proxy\n(api-blossom.benmega.com)"]
        
        subgraph Backend ["Backend (Flask App via Gunicorn)"]
            FlaskAPI["Flask API (Blueprints)"]
            SocketServer["Flask-SocketIO\n(gevent)"]
            Scheduler["Flask-APScheduler\n(Background Tasks)"]
            Auth["Auth & Sessions"]
            
            FlaskAPI --- Auth
            FlaskAPI --- SocketServer
            FlaskAPI --- Scheduler
        end
        
        subgraph Persistence ["Persistence Layer"]
            SQLite[("SQLite Database\n(prod_users.db)")]
            FileSystem[("File System\n(userData/, backups/)")]
        end
    end

    %% CI/CD
    subgraph CICD ["GitHub Actions (CI/CD)"]
        DeployFrontend["deploy-frontend.yml"]
        DeployAction["deploy.yml"]
        LintAction["lint.yml"]
        TestAction["tests.yml"]
    end

    %% Connections
    Student -->|HTTPS| CloudFront
    Teacher -->|HTTPS| CloudFront
    Parent -->|HTTPS| CloudFront
    
    CloudFront -->|Loads| React

    Axios -->|REST API Calls| Nginx
    SocketClient <-->|Real-time Events| Nginx
    
    Nginx -->|API Requests| FlaskAPI
    Nginx -->|WebSocket Upgrade| SocketServer

    FlaskAPI -->|Reads/Writes| SQLite
    SocketServer -->|Reads/Writes| SQLite
    FlaskAPI -->|Stores Uploads| FileSystem

    FlaskAPI <-->|AI Prompts & Responses| OpenAI
    Auth <-->|OAuth/SSO Tokens| Cognito
    
    Scheduler -.->|Maintenance Tasks| SQLite
    
    DeployFrontend -.->|Uploads Build| S3Bucket
    DeployAction -.->|Automated Deployments via SSH| EC2

    %% Styling
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
    classDef user fill:#bbf,stroke:#333,stroke-width:2px;
    classDef frontend fill:#d4edda,stroke:#28a745,stroke-width:2px;
    classDef backend fill:#cce5ff,stroke:#007bff,stroke-width:2px;
    classDef db fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef edge fill:#ffeeba,stroke:#ffc107,stroke-width:2px;
    
    class OpenAI,Cognito,ExternalPlatforms external;
    class Student,Teacher,Parent user;
    class React,State,SocketClient,Axios frontend;
    class FlaskAPI,SocketServer,Scheduler,Auth backend;
    class SQLite,FileSystem db;
    class CloudFront,S3Bucket edge;
```

---

## 1. High-Level Architecture Overview

Classroom Chat is built as a **Decoupled Single-Page Application (SPA)** architecture, consisting of a React-based frontend and a Flask-based backend API. They are hosted separately and operate independently:
- **Frontend** is hosted as static assets in an **AWS S3** bucket and served globally via **AWS CloudFront** (`blossom.benmega.com`). It handles the user interface, state management, and real-time updates.
- **Backend** is hosted on an **AWS EC2** instance, acting as the authoritative API and WebSocket server (`api-blossom.benmega.com`). It enforces business logic, database transactions, and integrations with third-party services.

## 2. Frontend Architecture (React SPA)
The frontend is designed for fluid, real-time interactivity, built with **React 19** and bundled via **Vite**.

- **Routing**: Handled by **React Router 7**, enabling seamless navigation without page reloads.
- **State Management**:
  - **Zustand**: Manages lightweight global state (e.g., authentication status, UI toggles).
  - **React Query (TanStack Query)**: Handles server-state caching, fetching, and data synchronization for API requests.
- **Data Communication**:
  - **Axios**: Used for standard REST API requests, sending credentials (cookies) securely to the backend.
  - **Socket.io Client**: Maintains a persistent connection to the backend for real-time chat, notifications, and dynamic updates.

## 3. Backend Architecture (Flask API)
The backend is a monolithic API built with **Flask 3.1.1**, leveraging an **Application Factory** pattern to keep configuration modular.

- **Routing (Blueprints)**: Endpoints are divided into logical modules (`user`, `admin`, `message`, `ai`, `shop`, etc.) allowing for clear separation of concerns.
- **Real-Time Communication**: Uses **Flask-SocketIO** with `gevent` for asynchronous event handling. Conversations use socket rooms to isolate message broadcasts.
- **Background Tasks**: Managed by **Flask-APScheduler** to execute periodic maintenance and updates independently of user requests.
- **Security & Auth**:
  - Integrates with **AWS Cognito** for SSO flows.
  - Secures routes with cookie-based Flask sessions, CSRF protection via Flask-WTF, and rate limiting via Flask-Limiter.
- **AI Integration**: The `ai` module interfaces with the **OpenAI API** to provide an intelligent "AI Teacher" within chat interfaces.

## 4. Persistence Layer
- **Relational Data (SQLite)**: The application utilizes **SQLite** (managed via SQLAlchemy ORM). The database file (`prod_users.db`) resides in the backend's `instance/` folder. This choice prioritizes simplicity and portability over distributed scaling.
- **File System**: User uploads (profile pictures, project images) are saved directly to the EC2 file system in the `userData/` directory.

## 5. Infrastructure & Deployment
The stack is deployed across AWS managed services and an EC2 instance.

- **Frontend Edge (S3 + CloudFront)**:
  - Static frontend files are stored in an S3 bucket.
  - CloudFront serves as a CDN, providing SSL termination and fast global delivery for `blossom.benmega.com`.
- **Backend Web Server (Nginx on EC2)**: 
  - Handles SSL termination and routes requests for `api-blossom.benmega.com`.
  - Proxies API and WebSocket traffic to the internal Gunicorn server.
- **Application Server (Gunicorn on EC2)**: Runs the Flask application, using `gevent` worker classes to support the concurrent long-polling/WebSocket connections required by Socket.IO.
- **CI/CD (GitHub Actions)**:
  - `lint.yml` and `tests.yml` enforce code quality and correctness on Pull Requests.
  - `deploy-frontend.yml` uploads the built React SPA to S3 on merging to the `deploy` branch.
  - `deploy.yml` triggers automated SSH deployments upon merging to the `deploy` branch, running the backend deployment script (`deploy.sh`) to restart services on the EC2.
