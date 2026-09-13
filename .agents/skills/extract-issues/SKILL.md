---
name: extract-issues
description: Process a user transcript from a recording of a human reviewer, verify findings, and generate Jira-style issue tickets.
---

# Extract Issues Workflow

This workflow automatically processes a transcript from a human application review or testing session, extracts distinct problems, optionally verifies them in the app, and outputs structured, Jira-style markdown tickets into the `issues/` directory.

## Step 1: Input and Transcript Analysis
1. Read the transcript provided by the user line by line.
2. Group related findings into distinct, actionable issues. Categories typically include:
   - **Functional Bug**: Something is broken, throwing errors, or not working as intended.
   - **UI/UX**: Layout issues, styling inconsistencies, contrast problems, mobile responsiveness, etc.
   - **Feature Request/Enhancement**: The reviewer asks for new features or improvements that aren't strictly bugs.
3. For each issue, identify the expected behavior, reproduction steps implicitly mentioned, and any specific constraints (like screen size or user role).

## Step 2: Determine Next Issue ID
1. Use the `list_dir` tool on the `./issues/` directory to review existing issues.
2. Find the highest issue number currently in use (e.g., `iss_116_...`).
3. Increment this number for the new tickets you create (e.g., `iss_117`, `iss_118`).

## Step 3: Issue Verification (Recommended)
Before blindly creating tickets, verify the issues against the live application using the `browser_subagent`.

1. Authenticate to the application using the appropriate context (refer to `@/login` skill, defaulting to the `/dev-login` path). Use `role=admin` or `role=student` as context dictates.
2. Navigate to the relevant pages mentioned in the transcript.
3. Perform the actions described by the reviewer to reproduce the bug or visual issue.
4. Record the outcome (e.g., "Confirmed 404 error", "Confirmed styling mismatch").

## Step 4: Issue Ticket Generation
For each identified issue, create a new file in the `./issues/` directory.

1. Use the `write_to_file` tool.
2. Name the file using the format: `iss_{number}_{short_snake_case_description}.md` (e.g., `iss_120_submit_challenge_styling.md`).
3. Use the following structured Jira-style markdown format:

```markdown
# iss_{number}_{short_description}
**Status**: Open
**Priority**: [High/Medium/Low]
**Type**: [Functional Bug/UI/UX/Feature Request/Performance]

## Description
[A concise description of the issue gathered directly from the transcript.]

## Requirements
- [Actionable changes needed to resolve the ticket.]
- [Any design, functionality, or structural expectations.]

## Repro Steps
1. [Step 1 derived from transcript]
2. [Step 2]
3. [Observed incorrect result]

## Verification Results
- [Summary of findings from your `browser_subagent` verification. Do not skip this section; if you couldn't verify, say so and explain why.]
```

## Step 5: Final Summary
After all issues have been reviewed, verified, and tickets generated, present the user with a markdown table summarizing the new tickets. Ensure you include:
- The ID
- The clearly formatted title
- Priority
- Type
- A clickable markdown link to the newly created file (e.g., `[iss_117](file:///c:/Users/.../issues/iss_117_...).md`).
