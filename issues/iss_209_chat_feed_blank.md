---
id: iss_209
title: "Global Chat Feed Renders Blank Screen"
status: "Open"
priority: "High"
type: "Bug"
---

## Description
The new Global Social Feed (`/chat`) fails to render completely. Upon navigating to the route as an admin, the screen is entirely blank aside from the background gradient. No UI elements, messages, or layout navigation are visible, indicating a critical rendering failure or crash in the component tree.

## Environment
- **Platform:** Desktop
- **Resolution:** 1440x900
- **Role:** Admin

## Steps to Reproduce
1. Log in as an admin user (`/dev-login?role=admin`).
2. Navigate to the `/chat` route.
3. Observe the blank screen instead of the new global social feed architecture.

## Expected Behavior
The Global Social Feed should render correctly, displaying the feed and providing the new message targeting features (classrooms, users, live students).

## Screenshot
![Chat Feed Blank Screen](C:\Users\Ben\.gemini\antigravity\brain\bf6f7cf5-b7ae-4615-8732-523ebbc13b1f\.system_generated\worktrees\subagent-Desktop-UI-QA-Subagent-self-033cbdec\issues\screenshots\chat_feed.png)
