# Issue: Silent Failure When Sending Messages in Announcements

## Status
- **ID**: `iss_202`
- **Severity**: Low
- **Category**: Error States / Empty States
- **Component**: Chat Input

## Description
Attempting to send a message in a restricted or read-only channel (like Announcements) results in a silent failure. 

### Findings
When typing text (e.g., an XSS test payload `<script>alert(1)</script>`) into the message input and clicking the Send button, the button registers the click, but the input is not cleared, the message is not posted, and no error message or visual feedback is provided to the user.

## Impact
Users may think the application is broken or their connection dropped because there is no feedback indicating why their message wasn't sent.

## Steps to Reproduce
1. Navigate to the Announcements channel.
2. Type a message in the input box.
3. Click the Send button.
4. Observe that the text remains in the input and no error toast/message is displayed.

## Proposed Fix
- Disable the message input entirely for read-only channels.
- Alternatively, if the failure is due to a server rejection, display an error toast (e.g., "You do not have permission to post in this channel") and clear the input or reset the state.
