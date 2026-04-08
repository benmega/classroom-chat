# Advanced Panel Model Links Redirect to Home

## Description
Within the Advanced Panel (`/admin/advanced`), clicking on database model links (such as Users, Projects, Achievements) redirects the user back to the main chat interface (`/`) rather than opening the expected Flask-Admin database view.

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Advanced Panel (`/admin/advanced`).
3. Click on any of the presented model administration links.
4. Observe the redirection back to the home page.

## Expected Result
Clicking a model link should direct the admin to a protected view (e.g., the Flask-Admin interface) where they can manage raw database entries.

## Actual Result
The routing intercepts the request and redirects to the home page, likely due to a permission check failure or a misconfigured proxy/route.

## Impact
Major - The Advanced Panel is completely non-functional, preventing direct database management from the UI.

## Screenshots
![Advanced Panel](file:///C:/Users/Ben/.gemini/antigravity/brain/843c6c4a-888e-4344-bd49-a68208c21638/admin_panel_audit_1775578777190.webp)
