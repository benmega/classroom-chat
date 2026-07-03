---
id: iss_210
title: "Parent Dashboard Inherits Incorrect Global Search Layout"
status: "Open"
priority: "Medium"
type: "Bug"
---

## Description
The updated Parent Dashboard (`/parent/dashboard`) is currently rendered with the standard application header, which includes a global "Search users..." search bar. This global navigation layout is inappropriate for the parent portal view, which should likely not have access to a global student/user search.

## Environment
- **Platform:** Desktop
- **Resolution:** 1440x900
- **Role:** Parent

## Steps to Reproduce
1. Log in as a parent user (`/dev-login?role=parent`).
2. Navigate to the `/parent/dashboard` route.
3. Observe the top navigation bar containing the global "Search users..." input field.

## Expected Behavior
The Parent Dashboard should have an updated and isolated layout navigation tailored for parents, without exposing the global user search bar.

## Screenshot
![Parent Dashboard UI](C:\Users\Ben\.gemini\antigravity\brain\bf6f7cf5-b7ae-4615-8732-523ebbc13b1f\.system_generated\worktrees\subagent-Desktop-UI-QA-Subagent-self-033cbdec\issues\screenshots\parent_dashboard.png)
