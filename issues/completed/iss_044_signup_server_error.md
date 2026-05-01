# Signup Process (500 Internal Server Error)

## Description
The signup process is currently broken. When a new user attempts to register via the `/signup` page, the backend returns a **500 Internal Server Error** after clicking "Request Access." Manual inspection reveals that the POST request to `/user/signup` fails on the server side.

## Steps to Reproduce
1. Ensure you are logged out.
2. Navigate to `/signup`.
3. Fill in a unique username (e.g., `testuser123`) and a password.
4. Click "Request Access."
5. Observe the red error toast and the 500 error in the network logs.

## Expected Result
The user should either be registered and redirected to the login/home page or receive a specific error if the username is taken.

## Actual Result
The server crashes or fails to process the request, returning a generic 500 error.

## Impact
Critical - New users cannot join the platform.

## Screenshots
![Signup Page Initial](file:///C:/Users/Ben/.gemini/antigravity/brain/5aceb4c8-90d5-421e-b921-34c594004784/signup_page_initial_1775574748027.png)
![Signup Error](file:///C:/Users/Ben/.gemini/antigravity/brain/5aceb4c8-90d5-421e-b921-34c594004784/signup_error_taken_1775574802966.png)
