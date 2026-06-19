# Unbroken Long Strings Dominate Social Feed

## Description
When a user posts a message consisting of a very long, continuous string without spaces (e.g., "monokumamonokuma..."), the text wraps but creates a massive, unbroken block that dominates vertical screen space on mobile.

## Steps to Reproduce
1. Post a very long string without spaces in the social feed.
2. View the post on a mobile viewport.

## Expected Result
Long continuous strings should either be truncated with a "Read more" toggle or aggressively wrapped with word breaks to prevent them from taking over the feed visually.

## Actual Result
The unbroken string wraps continuously, creating a dense wall of text that severely impacts the aesthetics and scannability of the feed.

## Impact
Low - Mostly an aesthetic nuisance, though it degrades the premium feel of the mobile layout.

## Screenshots
![Long String Wrapping](c:\Users\Ben\AntiGravity\classroom-chat\issues\screenshots\mobile_admin_dashboard.png)
