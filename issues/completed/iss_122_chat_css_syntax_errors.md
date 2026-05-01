# iss_122_chat_css_syntax_errors
**Status**: Completed
**Resolution Date**: 2026-04-19
**Priority**: High
**Type**: UI/UX Bug

## Description
The `Chat.css` file contains numerous syntax errors where properties are written in camelCase (React style) instead of kebab-case (standard CSS style). This prevents the browser from applying these styles, leading to a broken or unpolished UI in the chat interface.

## Affected Properties
- `marginBottom` -> `margin-bottom`
- `fontWeight` -> `font-weight`
- `fontSize` -> `font-size`
- `flexShrink` -> `flex-shrink`
- `textAlign` -> `text-align`
- `maxWidth` -> `max-width`
- `borderRadius` -> `border-radius`
- `boxShadow` -> `box-shadow`
- `lineHeight` -> `line-height`
- `overflowWrap` -> `overflow-wrap`

## Repro Steps
1. Navigate to the Chat page.
2. Inspect any message bubble or sidebar item.
3. Observe in the browser dev tools that these properties are marked as "Unknown property name" or simply ignored.
4. Notice that text alignment, font weights, and rounded corners are not being applied correctly.

## Requirements
- Audit `Chat.css` and convert all camelCase properties to standard CSS kebab-case.
- Ensure all values remains consistent with the design system.
