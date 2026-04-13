# Bug: Chat Area Header Overlap (Desktop)

## Description
On the Desktop dashboard, the fixed/sticky top header overlaps the top-most content of the chat message area. This causes the first message in a conversation to be partially or fully obscured by the glassmorphism header.

## Steps to Reproduce
1. Log in as an admin or student.
2. Navigate to the Dashboard.
3. Observe the first message in the chat area.

## Expected Result
The chat content area should have sufficient top padding or margin to ensure messages scroll below the header without being obscured when at the top.

## Actual Result
Top message is partially covered by the header.

## Impact
**Medium (UX).** Affects readability and makes the interface feel broken, though messages are still accessible via scrolling.

## Screenshots
![Chat Header Overlap](C:\Users\Ben\.gemini\antigravity\brain\45962e20-3f07-4658-83d8-1275bab4fbd0\dashboard_maximized_1775705735523.png)
