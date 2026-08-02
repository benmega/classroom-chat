# Parent Chat Sidebar Navigation Missing in Desktop Viewport

## Description
In the Chat interface (`/chat`), parent accounts experience a missing or non-functional chat sidebar (`Chat Sidebar Visible: False`). Unlike student or admin views, the sidebar for searching contacts, selecting active messaging threads with teachers, or creating new support chats does not render or collapses unexpectedly on Desktop viewport (1440x900).

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Navigate to `http://localhost:5173/chat` on a Desktop viewport (1440x900).
3. Observe the left side of the Chat layout.

## Expected Result
A chat sidebar should be visible on Desktop viewports allowing parents to browse and select conversations with teachers, school staff, or system channels.

## Actual Result
The chat sidebar element is missing or fails to render for Parent users, leaving only a blank chat background or single empty header.

## Impact
Major - Prevents parents from selecting or starting messaging channels with teachers.

## Screenshots
![Parent Chat Missing Sidebar](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_219_parent_chat_desktop.png)
