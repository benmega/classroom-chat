# Frontend Technical Design Document - Classroom Chat

This document outlines the architectural design, technology stack, and implementation patterns of the Classroom Chat frontend.

## 1. Overview
The Classroom Chat frontend is a modern, responsive single-page application (SPA) built to provide a premium and interactive experience for students and administrators. It prioritizes "Rich Aesthetics" with a focus on fluid animations, glassmorphism, and a robust design system.

### Core Technology Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- **Data Fetching**: [Axios](https://axios-http.com/) & [TanStack Query (React Query) v5](https://tanstack.com/query/latest)
- **Real-time**: [Socket.io Client](https://socket.io/docs/v4/client-api/)
- **Styling**: Vanilla CSS with Global Variables (Design Tokens)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Chart.js](https://www.chartjs.org/) & [React-chartjs-2](https://react-chartjs-2.js.org/)

---

## 2. Architecture

### Component Hierarchy & Layouts
The application uses a layout-based approach to share common UI elements across different routes:

- **`App.jsx`**: The root component containing the Router, Global Providers (QueryClient, SidebarContext, Toaster), and high-level Route definitions.
- **Protected Routes**: A `ProtectedRoute` wrapper handles authentication checks and redirects unauthenticated users to `/login`.
- **Layouts**:
  - **`Layout`**: The default layout for students, including the sidebar and main content area.
  - **`AdminLayout`**: A specialized layout for administrative pages, providing distinct navigation and sidebar options.

### Routing Logic
Routing is managed by `react-router-dom`. Routes are split into:
1. **Public Routes**: `/login`, `/signup`.
2. **Student Routes**: Dashboard (`/`), Profile (`/profile/:slug?`), Chat, Achievements, etc.
3. **Admin Routes**: Nested under `/admin/*`, protecting all administrative panels with `adminOnly` flags.

---

## 3. State Management

### 3.1 Global State (Zustand)
We use **Zustand** for lightweight, high-performance global state. The primary store is:
- **`useAuthStore`**: Manages user session, authentication status, and auth-related actions (`checkAuth`, `login`, `logout`).

### 3.2 Context API
The **Context API** is used for UI-specific global state that needs to be consumed deep in the tree without the overhead of a dedicated store:
- **`SidebarContext`**: Manages the open/closed state of the navigation sidebar, particularly for mobile responsiveness.

### 3.3 Server State (React Query)
While `useState` is still used in some legacy or simple components, the application is moving towards **TanStack Query** for data fetching, caching, and synchronization. This helps reduce boilerplate and ensures "fresh" data across the app.

---

## 4. Data Communication

### 4.1 Axios Client
Centralized configuration in `src/api/client.js` handles:
- Base URL (via `VITE_API_URL` environment variable).
- Credentials (`withCredentials: true`) for cookie-based session management.
- Standard headers for JSON communication.

### 4.2 Real-time Messaging
Real-time features, primarily the Chat system, are implemented using **Socket.io**.
- **`useChatSocket.js`**: A custom hook that manages socket connection, joins rooms (conversations), and listens for incoming messages, updating the UI in real-time.

---

## 5. Design System

### 5.1 Design Tokens
Styles are driven by a centralized token system in `variables.css`. This ensures consistency across components.
- **Colors**: Curated palette with HSL values for primary, secondary, and accent colors.
- **Typography**: Uses 'Inter' for body and 'Outfit' for headings.
- **Glassmorphism**: Standardized `--glass-bg`, `--glass-blur`, and `--glass-border` tokens.

### 5.2 Premium UI Components
Common UI patterns are encapsulated in reusable classes and components:
- **`glass-panel`**: Applies a backdrop blur and soft border.
- **`card-premium`**: Elevated cards with hover lift effects.
- **`btn-premium`**: Gradient-filled buttons with "bounce" transitions.
- **`SmartImage`**: A utility component for handling profile pictures with automatic fallbacks.

---

## 6. Directory Structure

```text
frontend/src/
├── api/          # Axios client and API wrappers
├── assets/       # Static assets, global CSS variables
├── components/   # Reusable UI components (common, layout, icons)
├── context/      # React Context providers (e.g., SidebarContext)
├── hooks/        # Custom React hooks (real-time chat, logic)
├── pages/        # Main route views (Admin, Auth, Chat, Profile, etc.)
├── store/        # Zustand stores for global state
└── test/         # Vitest setup and common test utilities
```

---

## 7. Testing Strategy

### 7.1 Unit & Component Testing
- **Tools**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro).
- **Scope**: Testing individual hooks (e.g., `useAuthStore`), utility functions, and complex UI components.
- **Mocking**: [MSW (Mock Service Worker)](https://mswjs.io/) is used to intercept network requests during tests.

### 7.2 E2E Testing
- **Tool**: [Playwright](https://playwright.dev/).
- **Scope**: Testing end-to-end user flows such as login, sending a message, and editing a profile.

---

## 8. Future Improvements
- **Full React Query Migration**: Replace remaining `useEffect` data fetching with Query hooks for better caching.
- **Dynamic Theming**: Extend the CSS variable system to support a native Dark Mode toggle.
- **Component Documentation**: Implement a tool like Storybook for isolated component development and documentation.
