# Issue: Autolinker Includes Trailing Commas in URLs

## Status
- **ID**: `iss_201`
- **Severity**: Medium
- **Category**: Input Validation / Parsing
- **Component**: Chat Messages

## Description
When multiple links are pasted in a chat message separated by commas, the URL parser incorrectly includes the trailing comma as part of the `href` attribute, breaking the link.

### Findings
In the "Announcements" channel, a message containing multiple Google Docs links separated by commas renders the links with the comma attached:
`https://docs.google.com/presentation/d/.../edit?usp=sharing,`

## Impact
Users clicking on these links will be directed to an invalid URL (resulting in a 404 from the destination site), breaking the functionality of sharing multiple links in a single block of text.

## Steps to Reproduce
1. View the Announcements pinned chat.
2. Observe the links posted in the history.
3. Click a link or inspect the `href` attribute and note the trailing `,`.

## Proposed Fix
- Update the regex used for the autolinker (or the markdown parser) to exclude trailing punctuation (like commas and periods) from the end of parsed URLs.

## Screenshots
- [autolink_trailing_comma_screenshot](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/iss_201_autolink_trailing_comma.webp)
