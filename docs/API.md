# API Documentation

> **Note:** This file is kept for legacy compatibility. For the complete, up-to-date catalog of all backend API endpoints, please refer to **[`api_reference.md`](./api_reference.md)**.

## Authentication Requirement
All API endpoints (except public routes like `/login` and `/signup`) require a valid session cookie. If a request is made without authentication, the server will return a `401 Unauthorized` response for JSON requests.
