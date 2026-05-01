# Profile Edit Button Mismatch (Labeled "Settings")

## Description
The primary action button on the student profile header is labeled "Settings" instead of "Edit Profile". While it leads to the correct page, "Settings" is often associated with account-wide configurations rather than profile-specific edits.

## Steps to Reproduce
1. Log in as a student.
2. Navigate to the Profile page (`/profile`).
3. Observe the button next to the student's name/title.

## Expected Result
A button labeled "Edit Profile" (or similar) to clearly indicate the action of modifying profile information.

## Actual Result
The button is labeled "Settings" and uses a gear icon.

## Impact
Low - Minor labeling inconsistency that slightly affects navigation clarity.

## Root Cause
The button was hardcoded with the label "Settings" and used the `Settings` icon from Lucide, which was misleading since the button primary action is to edit the user's profile.

## Changed Files
- `frontend/src/pages/Profile/index.jsx`: Updated the button label to "Edit Profile" and changed the icon to `User`.

## Resolution Evidence
![Fixed Profile Button](file:///C:/Users/Ben/.gemini/antigravity/brain/0a4bd8a6-1f9a-459d-8c3f-adbff615ef58/profile_edit_button_verification_1776006378154.png)
