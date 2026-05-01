# Missing Welcome Greeting on Landing Page

## Description
The main landing page (currently redirecting to Chat) lacks a personalized welcome message for the logged-in user.

## Steps to Reproduce
1. Log in to the application.
2. View the main content area of the landing page.

## Expected Result
A prominent welcome message (e.g., "Welcome back, Phu!") should be visible to enhance the user experience.

## Actual Result
No welcome message is found; the page goes straight to the chat/recent view.

## Impact
Low - UX refinement to make the app feel more welcoming and personalized.

## Screenshots
[Verification via browser subagent audit]

## Root Cause
The `Chat` component was automatically selecting the first available conversation from the user's history on initial load. This caused the main content area to immediately render the message list, bypassing the existing (but hidden) welcome greeting logic.

## Resolution
Disabled the automatic selection of the first conversation in `Chat.jsx` during the initial data fetch. This allows the component's fallback "empty state" (which contains the personalized welcome message) to be displayed until the user explicitly selects a conversation or channel.

## Changed Files
- `frontend/src/pages/Chat/Chat.jsx`

## Evidence
Confirmed that the "Welcome back, Phu!" message is now prominently visible upon landing.
![Welcome Message](file:///C:/Users/Ben/.gemini/antigravity/brain/48466a53-8d23-42bc-b275-87076f2f3ae5/welcome_message_phu_1776310778130.png)

