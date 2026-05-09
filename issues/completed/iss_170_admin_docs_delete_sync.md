# Admin: Document Delete UI Sync Failure

## Description
Deleting a document in the Admin Document Manager results in a successful server-side deletion, but the UI fails to update or show success because of a frontend/backend response mismatch.

## Details
- **Frontend**: Expects `response.data.status === 'success'` in `AdminDocuments.jsx`.
- **Backend**: Returns `{"success": true}` in `doc_routes.py`.

## Steps to Reproduce
1. Go to Admin -> Documents.
2. Click "Delete" on any file.
3. Confirm deletion.
4. Observe that no success toast appears and the file remains in the list until the page is manually refreshed.

## Expected Result
A success message should appear, and the file should disappear from the list immediately.

## Actual Result
The UI remains static after the request completes.

## Impact
Medium - Makes the "Delete" action appear broken or unresponsive to the administrator.
