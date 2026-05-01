# iss_123_sidebar_context_export_missing
**Status**: Completed
**Resolution Date**: 2026-04-19
**Priority**: Medium
**Type**: Technical Debt / Bug

## Description
The `SidebarContext.jsx` file does not export the `useSidebar` hook, which is instead located in `hooks/useSidebar.js`. This causes confusion and potential import errors (as seen in recent automated tests) when developers or subagents assume the hook is exported alongside the provider.

## Repro Steps
1. Attempt to import `{ useSidebar }` from `../context/SidebarContext`.
2. Observe the error: "Named export 'useSidebar' not found".

## Requirements
- Export `useSidebar` from `SidebarContext.jsx` to provide a single point of entry for sidebar state, while maintaining the hook's implementation.
- Or, ensure all components consistently use the `hooks/useSidebar.js` path and update documentation to clarify this.
