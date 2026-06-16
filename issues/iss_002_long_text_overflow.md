# Long Text Overflow in Feed Posts

## Description
When a user posts a very long string of continuous characters without spaces (e.g., "monokumamonokumamonokuma..."), the text does not wrap. Instead, it overflows its container, disrupting the horizontal layout of the feed.

## Steps to Reproduce
1. Log into the application and navigate to the main feed/dashboard.
2. Create a new post containing a continuous string of 100+ characters without spaces.
3. Submit the post and observe how it is rendered in the feed.

## Expected Result
The long text should break onto a new line and remain constrained within the boundaries of the post bubble or feed column (e.g., using `overflow-wrap: anywhere` or `word-break: break-word`).

## Actual Result
The text continues on a single line, overflowing the message container and breaking the UI constraints.

## Impact
Low - Visual bug that occurs in edge cases but degrades the premium feel of the UI.

## Screenshots
![Chat Feed Overflow](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/desktop_chat_audit.png)
