# Classroom Chat: Next Steps Prompts

These prompts are designed for an agent to continue the work of separating the frontend and backend of the Classroom Chat application.

---

## 1. Component Migration (Jinja2 to React)

**Task:** Migrate the core "Chat" and "Profile" pages from Jinja2 templates to functional React components.

**Context:**
- **Backend**: `backend/application/routes/user_routes.py` and `message_routes.py` already support JSON responses.
- **Frontend**: A Vite + React project is initialized in `frontend/`. Global state (auth) is managed in `src/store/useAuthStore.js`.
- **Legacy templates**: Located in `frontend/templates/`. Specifically, look at `user/profile.html` and `chat/index.html`.
- **Legacy CSS**: Located in `frontend/static/css/`. Use `variables.css` for brand consistency.
- **Requirement**: Use `lucide-react` for icons and implement a clean, premium design. Ensure the "Chat" interface uses `message_routes.py` for history and the standard JSON envelope (`{ status, data, error }`).

**Key Files to Review:**
- `frontend/templates/user/profile.html`
- `backend/application/routes/message_routes.py`
- `frontend/src/App.jsx` (Add new routes here)

---

## 2. Socket.io Client Implementation

**Task:** Re-integrate real-time chat functionality by connecting the React frontend to the backend's Socket.io instance.

**Context:**
- **Backend**: Flask-SocketIO is initialized in `backend/application/__init__.py` and events are defined in `backend/application/socket_events.py`. CORS is currently set to `*`.
- **Frontend**: Install `socket.io-client`. Create a logic (e.g., a custom hook `useChatSocket`) that listens for `'message_received'` and emits `'send_message'`.
- **Integration**: Ensure the socket uses `withCredentials: true` and connects to the backend base URL (from `frontend/src/api/client.js`).

**Key Files to Review:**
- `backend/application/socket_events.py`
- `backend/application/__init__.py` (SocketIO init section)
- `frontend/src/api/client.js`

---

## 3. File Upload Refactor (FormData)

**Task:** Refactor profile picture and project image upload routes to support SPA interactions via FormData.

**Context:**
- **Current logic**: `user_routes.py` has `handle_profile_picture_upload` and `handle_project_image_upload` which expect standard form-data and redirect/flash on success.
- **Goal**: 
    1. Update the backend to return JSON response envelopes (using `@api_response`) containing the new file URL.
    2. Implement an `ImageUpload` component in React that uses `axios` and `FormData`.
    3. Ensure error handling (file too large, invalid format) returns a `400` status with a clear error payload.

**Key Files to Review:**
- `backend/application/routes/user_routes.py` (helpers at the bottom)
- `backend/application/decorators/api_response.py`
- `backend/application/routes/upload_routes.py`

---

## 4. Production Build & Deployment Setup

**Task:** Update the deployment pipeline to build the React frontend and configure the Flask backend to serve the production assets.

**Context:**
- **Backend Servicing**: Update `backend/application/__init__.py` to set the `static_folder` and `template_folder` paths to `../../frontend/dist` when `FLASK_ENV=production`.
- **Catch-all Route**: Implement a catch-all route in Flask that serves `dist/index.html` for any non-API routes, allowing React Router to handle client-side navigation.
- **Deployment Script**: Update `deploy.sh` to include a build step: `cd frontend && npm install && npm run build`.
- **CORS Handling**: Ensure CORS is configured correctly for production origins.

**Key Files to Review:**
- `deploy.sh`
- `backend/application/__init__.py` (App creation logic)
- `backend/application/routes/general_routes.py` (Potential location for catch-all)
