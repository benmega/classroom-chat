# Chat Input Placeholder Text Clipping

## Description
On mobile viewports, the placeholder text "Message Global Announcements" within the chat input field is clipped at the bottom. The input box lacks sufficient height or has incorrect padding, causing the descenders of the letters to be cut off.

## Steps to Reproduce
1. Authenticate and open the application on a mobile viewport (e.g., iPhone 13, 390x844).
2. Navigate to the Chat view (`/chat` or the default `/`).
3. Observe the chat input field at the bottom of the screen before typing any text.

## Expected Result
The placeholder text should be fully visible, vertically centered, and not clipped at the bottom.

## Actual Result
The placeholder text is shifted downwards or the container is too short, clipping the bottom half of the text.

## Impact
Medium - It causes a noticeable visual degradation that impacts the premium feel of the application on mobile devices.

## Screenshots
![Chat Placeholder Clipping](c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/mobile_audit/03_chat.png)
