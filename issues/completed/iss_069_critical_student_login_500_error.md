# Critical: Student Login Fails with 500 Internal Server Error

## Description
Attempting to log in as a student user (`blossomstudent01`) results in a `500 Internal Server Error` response from the `/user/login` endpoint. This prevents students from accessing their dashboard and the chat application.

## Steps to Reproduce
1. Navigate to `http://localhost:5173/login`.
2. Enter username `blossomstudent01`.
3. Enter password `Bls01`.
4. Click the 'Login' button.

## Expected Result
The user should be successfully authenticated and redirected to the student dashboard (`http://localhost:5173/`).

## Actual Result
The browser console shows a `500 Internal Server Error` for the POST request to `/user/login`, and the user remains on the login page.

## Impact
Critical - Students cannot use the application.

## Screenshots
![Login Page Status](file:///C:/Users/Ben/.gemini/antigravity/brain/88abffad-61f3-424a-97ed-87817374f106/login_page_1776092482203.png)
