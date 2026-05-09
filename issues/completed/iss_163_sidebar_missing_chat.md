# Conversations List Inaccessible in Mobile Sidebar

## Description
When the application is viewed on a mobile viewport, the sidebar only displays standard navigation links (Profile, Admin Panel, Achievements, etc.). The list of active chat conversations/rooms is entirely missing or rendered off-screen, preventing users from accessing their chats.

## Steps to Reproduce
1. Authenticate and open the application.
2. Resize the viewport to a mobile width (e.g., 390px).
3. Click the hamburger menu on the Dashboard or Chat page to open the sidebar.
4. Look for the list of chat rooms/conversations.

## Expected Result
The list of active chats should be visible within the mobile sidebar, either below or above the main navigation links.

## Actual Result
Only navigation links are visible; the chat list is missing. Dashboard text says "Pick a channel or conversation from the sidebar" but none exist.

## Impact
Critical - Users cannot navigate to different chat rooms or view their message list on mobile devices.

## Screenshots
![Missing Chat List](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_sidebar_missing_chat.png)
