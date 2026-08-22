# Chat Delete Button Touch Target Too Small on Mobile

## Description
During the mobile viewport review, the delete button for chat messages (`.delete-message-btn`) was found to have a touch target smaller than the recommended 44x44px. This can cause usability friction on mobile devices where precision tapping is harder.

## Steps to Reproduce
1. Log in as a Student.
2. Navigate to the Chat interface on a mobile viewport (e.g., iPhone 12/13/SE, 375px width).
3. Attempt to tap the delete button (trash can icon) on one of your own messages.

## Expected Result
The touch target should be at least 44x44px to comply with accessibility guidelines and prevent misclicks.

## Actual Result
The button relied on small padding (`8px`) which resulted in a touch area less than 44x44px.

## Impact
Medium - Usability issue that affects the core chat experience for mobile users.

## Screenshots
![Chat Delete Button](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/chat-delete-mobile.png)

## Resolution
Fixed in `Chat.css` by explicitly setting `min-width: 44px` and `min-height: 44px` for the mobile media query.