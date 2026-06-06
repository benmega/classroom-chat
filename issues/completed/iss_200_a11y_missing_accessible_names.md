# Issue: Missing Accessible Names and Attributes for Form Controls

## Status
- **ID**: `iss_200`
- **Severity**: High
- **Category**: Accessibility (a11y)
- **Component**: Chat Interface (Buttons & Inputs)

## Description
Several interactive elements in the chat interface are missing accessible names or required attributes, hindering screen reader users and keyboard navigation.

### Findings
1. **Send Message Button**: The main send button (`uid=7_1184`) lacks both text content and an `aria-label`.
2. **Tour Close Button**: The button next to "Next" in the Welcome tour (`uid=7_3`) has no accessible name.
3. **Search Inputs**: The search inputs (`uid=7_19` and `uid=7_7`) are missing `id` or `name` attributes, which triggers console warnings (`[issue] A form field element should have an id or name attribute`).

## Impact
Screen reader users will not know the purpose of the Send or Close buttons, and form inputs will not be correctly associated with labels, making the application non-compliant with WCAG guidelines.

## Steps to Reproduce
1. Navigate to the main chat dashboard.
2. Inspect the Send Message button in the chat input area.
3. Check the developer console for warnings regarding form field elements.

## Proposed Fix
- Add `aria-label="Send message"` to the send button and appropriate label to the tour close button.
- Ensure all `<input>` elements have proper `id` and `name` attributes.

## Screenshots
- [a11y_missing_names_screenshot](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/iss_200_a11y_missing_names.webp)

## Verification Results
- Added `aria-label="Send message"` to the send button in `Chat.jsx`.
- Added `aria-label="Close tutorial"` to the tour close button in `Tutorial.jsx`.
- Added `name="search"` and fallback `id` to the search input in `UserSearchInput.jsx`.
