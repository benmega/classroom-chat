# Frontend fails to load with Invalid Regular Expression error

**Issue ID**: iss_001
**Status**: Closed
**Severity**: High / Blocker

## Description
The React application fails to render and displays a blank white screen upon loading. Checking the browser console reveals a critical React error:
`[error] Uncaught SyntaxError: Invalid regular expression: /(^_+|+$)/g: Nothing to repeat`

## Steps to Reproduce
1. Authenticate via `http://localhost:8000/dev-login?role=admin`.
2. Wait for the redirect to the frontend at `http://localhost:5173/` (or navigate there directly).
3. Observe that the page is completely blank.
4. Check the browser console to see the SyntaxError.

## Impact
This is a critical blocker. The entire frontend is inaccessible, preventing any further UI testing or user interaction.

## Analysis & Possible Cause
The error string `/(^_+|+$)/g` indicates an invalid regular expression where `+` has nothing to repeat after the `|` operator. 
A search through the codebase reveals a very similar regular expression in `frontend/src/pages/General/ProjectInfo.jsx` at line 237:
`cleanSlug = cleanSlug.replace(/(^_+|_+$)/g, '');`
It's highly likely that this regex is either being mangled into `/(^_+|+$)/g` by a build tool/minifier, or there is another instance of a typo in the codebase that wasn't immediately picked up by text search.

## Attachments
- **Screenshot**: ![Frontend Blank Screen Error](file:///C:/Users/Ben/.gemini/antigravity/brain/dda34df2-ec71-4880-a8f4-22e7a83568b6/frontend_error_screenshot.png)

## Root Cause & Fix
The regular expression `/(^_+|_+$)/g` in `ProjectInfo.jsx` was being mangled by Vite/esbuild minification into `/(^_+|+$)/g`, causing a `SyntaxError` at runtime because `+` had nothing to repeat.
The issue was fixed by splitting the regex into two separate simpler replacements: `cleanSlug.replace(/^_+/g, '').replace(/_+$/g, '')`.

## Changed Files
- `frontend/src/pages/General/ProjectInfo.jsx`
