# iss_112_chat_search_non_functional
**Status**: Completed
**Resolution Date**: 2026-04-19

## Root Cause
The search logic in `ChatSidebar.jsx` was too restrictive, only filtering by the conversation title. It didn't account for participant names or message content, which is what users expect from a search feature. Additionally, the filtering was implemented inefficiently within the render return statement.

## Changes
- **frontend/src/components/chat/ChatSidebar.jsx**: Expanded the filtering logic to include conversation titles, formatted titles (dates), participant nicknames, participant usernames, and message content.
- Refactored the filtering to a `filteredConversations` constant before the component render for better performance and readability.

**Priority**: Medium
**Type**: Functional Bug

## Description
The "Search conversations" feature located in the top-left of the main chat page is non-functional. Users are unable to filter their conversation list even when searching for exact message fragments that exist in the chat history.

## Requirements
- The search input should filter the sidebar conversation list based on the search query.
- If the search query matches a participant name or a message fragment within a conversation, that conversation should remain visible; others should be hidden.
- If no matches are found, a "No conversations found" message should be displayed (this part is working, but it triggers even when matches *should* be found).
- Alternatively, if the feature is deemed too complex for a quick fix, it should be removed to avoid user confusion.

## Repro Steps
1. Log in as a student or admin.
2. Observe the conversation list in the sidebar.
3. Identify a message fragment (e.g., "World") that is visible in one of the conversations.
4. Type that fragment into the "Search conversations" input.
5. Observe that the list displays "No conversations found" despite the match.

## Verification Results (from initial audit)
- Logged in as student.
- Verified that exact strings from the chat list do not trigger a match.
- Console does not show immediate errors upon typing, suggesting a logic error in the filtering component rather than a network failure.
