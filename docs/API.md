
---

## API.md
### API Endpoints and Usage

```markdown
# API Documentation

## Authentication Endpoints
- **POST /login**
  - Description: Authenticate a user.
  - Parameters:
    - `username`: User's username.
    - `password`: User's password.

- **POST /logout**
  - Description: Log out a user.

## Challenge Endpoints
- **GET /challenges**
  - Description: Retrieve all challenges.

- **POST /challenges/<slug>**
  - Description: Submit challenge completion.
  - Parameters:
    - `slug`: Unique identifier for the challenge.

## Ducks Endpoints
- **GET /leaderboard**
  - Description: Retrieve the top performers.

- **GET /profile/<username>**
  - Description: Retrieve user profile data.