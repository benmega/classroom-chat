# Issue: Chat Interface Stretched on Desktop Viewports

## Metadata
- **Status**: Open
- **Priority**: Medium
- **Category**: Visual / UX
- **Viewport**: Desktop (1440px+)

## Description
The chat interface follows a mobile-first design that does not effectively adapt to wide desktop viewports. The message input field and chat bubbles span the entire width of the screen (1440px in testing), leading to poor readability and a "stretched" appearance that lacks a premium feel.

## Steps to Reproduce
1. Log in as a student user.
2. Navigate to the Chat/Dashboard page (/).
3. Set the browser viewport to 1440px width or larger.
4. Observe the excessively wide message input field and the large gaps between the message sidebar and the message bubbles.

## Expected Behavior
The chat interface should have a maximum content width or use a multi-column layout on desktop to maintain readability and aesthetic balance.

## Actual Behavior
The layout is fully fluid and expands to the edges of the 1440px viewport.

## Visual Proof
![Stretched Chat Layout](file:///C:/Users/Ben/.gemini/antigravity/brain/f3b6e1a1-61ea-478c-80a2-709cc822763c/dashboard_page_1775880866925.png)
*Note how the message input and header elements are extreme ends.*

## Environment
- **Browser**: Chrome (via browser_subagent)
- **Viewport**: 1440x900
