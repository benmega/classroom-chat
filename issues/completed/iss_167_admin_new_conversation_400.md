# Admin: "New Conversation" Modal Fails (Missing Classroom ID)

## Description
The "Start New Conversation" modal on the Admin Dashboard is missing a field to specify the `classroom_id`. Since the backend requires a classroom association for all conversations, submitting the form results in a 400 Bad Request error.

## Steps to Reproduce
1. Go to Admin Dashboard.
2. Click "Start New Conversation" in the Quick Actions sidebar.
3. Enter a topic and click "Start Conversation".
4. Observe the 400 error in the console/network tab.

## Expected Result
The modal should allow selecting a classroom, or the backend should have a default classroom (e.g., Global) if none is provided.

## Actual Result
Request fails because `classroom_id` is missing from the payload.

## Impact
Major - Admins cannot create new conversations from the dashboard.
