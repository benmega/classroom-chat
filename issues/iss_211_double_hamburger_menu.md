# Double Hamburger Menu on Parent Dashboard Mobile View

## Description
On mobile viewports, the Parent Dashboard displays two hamburger menu icons in the top navigation bar—one on the far left and one on the far right.

## Steps to Reproduce
1. Log in to the application as a Parent.
2. Ensure the viewport width is set to a mobile dimension (e.g., 390px).
3. Observe the top navigation header on the Parent Dashboard.

## Expected Result
A single hamburger menu icon should be present for navigation, following standard mobile UI conventions.

## Actual Result
Two hamburger menu icons are displayed simultaneously on the left and right sides of the header.

## Impact
Major - This creates a confusing and inconsistent navigation experience for parents on mobile devices.

## Screenshots
![Double Hamburger Menu](screenshots/parent_dashboard_mobile_audit.png)

## Technical Analysis & Proposed Fix
* **Root Cause**:
  - The right-hand menu icon on the profile toggle button uses `<HamburgerIcon>` which renders three lines (a hamburger menu icon) when user role is parent (`user?.role !== 'student'`).
  - The left-hand hamburger button renders if `!isParent` is true:
    ```jsx
    {isAuthenticated && !isParent && (
        <button className="hamburger-toggle mobile-only" onClick={toggleSidebar}>
            <Menu size={24} />
        </button>
    )}
    ```
  - During initial mount or context loading, if `user?.role` is undefined, `isParent` evaluates to `false`, rendering both the left-hand and right-hand hamburger menus simultaneously.
* **Proposed CSS & Code Fix**:
  - Ensure the left-hand hamburger menu button check is resilient to loading states (e.g. only render when `user` is fully loaded and `user.role` is verified).
  - Explicitly restrict parent header elements to only show the relevant single profile/navigation drawer toggle.
