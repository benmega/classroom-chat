# Issue: iss_010 - Project Modal Missing Media and Code Data

## Description
The "Classroom Chat" project on the admin profile shows a generic placeholder image and "Source code preview not available," which looks like a broken state to users.

## Findings
- The `image_url` for some projects points to files that may not exist or are generic placeholders.
- The `code_snippet` field is empty for several core projects, leaving the "Technical Logic" sidebar looking unfinished.

## Impact
**Low** - This is primarily a data issue, but it affects the first impression for new users or when viewing the creator's profile.

## Suggested Fix
- Seed the database with high-quality screenshots for core projects.
- Add meaningful code snippets to the `code_snippet` field for projects like "Classroom Chat" to showcase the "Technical Logic" feature.

## Screenshots
![Missing Project Data](file:///C:/Users/Ben/.gemini/antigravity/brain/0a1aab7a-4728-452d-8d76-a356f2e1ae0b/project_modal_open_1778899728248.png)


## Root Cause
The database seeding process lacked logic to provide a high-quality screenshot or proper code snippet for the Classroom Chat project.

## Changed Files
- backend/scratch/fix_project.py
- backend/userData/image/classroom_chat_screenshot.png
- Database updated