# Parent Report Card 403 Forbidden Unhandled Exception on Unlinked Student Reports

## Description
When a parent accesses a report card for an unlinked student ID or invalid student parameter (`/parent/report/:studentId`), the frontend calls `fetchHistory` (`/api/parents/student/:studentId/history`) which fails with HTTP 403 Forbidden. While the error state displays "Unable to Load Report", unhandled network 403 console errors are thrown, and the error UI lacks actionable options beyond a single back button.

## Steps to Reproduce
1. Log in as a Parent user via `http://localhost:8000/dev-login?role=parent`.
2. Navigate to `http://localhost:5173/parent/report/999` (or an unlinked student ID).
3. Open browser developer console.
4. Observe the unhandled 403 Forbidden console warning and network exception.

## Expected Result
Failed report lookups should gracefully catch HTTP 403 error codes without logging unhandled network exceptions, and offer a helpful empty state with options to link a new student.

## Actual Result
Console logs `AxiosError: Request failed with status code 403` on `fetchHistory`, and the error container renders minimal feedback.

## Impact
Medium - Generates unhandled network error logs in the browser console and offers sub-optimal error state handling.

## Screenshots
![Parent Report Card Error State](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_218_parent_report_card_403_desktop.png)
