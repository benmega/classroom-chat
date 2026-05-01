
---

## API.md
### API Endpoints and Usage

```markdown
# API Documentation

## Authentication Requirement
All API endpoints (except `/login` and `/signup`) require a valid session cookie. If a request is made without authentication, the server will return a `401 Unauthorized` response for JSON requests.

## Authentication Endpoints
- **POST /login**
  - Description: Authenticate a user and create a session cookie.
  - Parameters: `username`, `password`.

- **POST /logout**
  - Description: Invalidate the user session.

## Challenge Endpoints (Require Authentication)
- **GET /challenges**
  - Description: Retrieve all challenges for the current user.

- **POST /challenges/<slug>**
  - Description: Submit challenge completion.

## Ducks Endpoints (Require Authentication)
- **GET /leaderboard**
  - Description: Retrieve the top performers based on duck balance.

- **GET /profile/<username>**
  - Description: Retrieve detailed profile, including achievements and duck balance.

## Admin Endpoints (Require Admin Privileges)
- **GET /api/admin/users** – List all users.
- **POST /api/admin/duck-adjust** – Adjust a user's duck balance.
- **POST /api/admin/upload-badge** – Upload a new achievement badge.