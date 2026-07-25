---
description: Automatically analyze a target URL or component using browser subagents to critique the UX/UI against the Aesthetic Guidelines, and autonomously iterate on a redesign.
---

# Polish UI Workflow

This workflow automates the process of gathering visual and usability feedback on a specific UI element using the `browser` subagent, and autonomously executing a redesign loop to match the application's aesthetic.

## Usage
The user can trigger this workflow by providing a URL, a component name, or a general description of the scope of work. They can optionally specify a number of iterations.
Example: `@[/polish-ui] Evaluate the /admin/users/1 page and fix the header padding.`
Example: `@[/polish-ui] Refine the dashboard cards. Iterate 5 times.`

## Procedure

1.  **Context Gathering**: 
    - Identify the target URL or component from the user's request.
    - Review the [Aesthetic Guidelines](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/AESTHETIC_GUIDELINES.md) in the core app documentation to understand the current target aesthetic ("Flat with strategic glassmorphism").
    - If the user provides feedback in their request that conflicts with the established `AESTHETIC_GUIDELINES.md`, explicitly **notify the user of the conflict** and **update the guidelines file** to reflect their new preference before proceeding.
2.  **Authentication**:
    - If the target requires authentication, instruct the subagents to navigate to `http://localhost:8000/dev-login?role=admin` first to get an active session. (Note: port 8000 is backend, 5173 is frontend).
3.  **The Autonomous Loop**: 
    - Run the following critique-and-redesign loop. Default to **3 iterations** unless the user specifies otherwise, or until the subagents report zero aesthetic/usability violations.
    - **Step A (Critique)**: 
        - Launch two `@[/browser]` subagents simultaneously using `invoke_subagent`.
        - **Subagent 1 (Visual/UI Critic)**: Instruct it to navigate to the target URL, capture screenshots, and explicitly grade the UI against the principles in `AESTHETIC_GUIDELINES.md`. Ask it to report back on padding, colors, borders, and general alignment.
        - **Subagent 2 (Usability/UX Critic)**: Instruct it to navigate to the target and evaluate friction, click paths, information density, and interactive elements.
    - **Step B (Synthesis & Execution)**: 
        - Wait for both subagents to return their findings.
        - Synthesize their critiques.
        - **DO NOT present a plan to the user.** Immediately execute the redesign yourself based on the critiques. Modify the necessary `.jsx` and `.css` files.
    - **Step C (Iterate)**:
        - Go back to Step A and launch the critics again to evaluate your new code. Repeat up to the iteration limit.
4.  **Completion**: 
    - Once the iterations are complete, return to the user.
    - Create a `walkthrough.md` to summarize the completed polish, showing the final state and detailing the iterations.
