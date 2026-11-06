---
name: polish-ui
description: Critique a target URL or component against the Aesthetic Guidelines in the browser, and iterate on a redesign.
---

# Polish UI Workflow

Gather visual and usability feedback on one UI element with browser critics, then redesign it in a loop to match [AESTHETIC_GUIDELINES.md](../../../docs/AESTHETIC_GUIDELINES.md).

## Usage
The user gives a URL, a component name or a description of the scope, and optionally a number of iterations.
Example: "Polish the /admin/users/1 page and fix the header padding."
Example: "Refine the dashboard cards. Iterate 5 times."

## Procedure

1.  **Context**:
    - Identify the target URL or component.
    - Read the guidelines ("Flat with strategic glassmorphism"). If the user's feedback conflicts with them, tell the user and update `AESTHETIC_GUIDELINES.md` to the new preference before continuing.
    - Keep the playful copy, emoji and Easter eggs ([PERSONALITY_GUIDE.md](../../../PERSONALITY_GUIDE.md)); restyle only.
2.  **Authentication**: if the target needs a session, log in via the [login skill](../login/SKILL.md).
3.  **Loop** (default 3 iterations, or until the critics report no violations):
    - **Critique**: run two browser sub-agents (a visual critic and a usability critic), or one agent doing both critiques if sub-agents aren't available.
        - **Visual critic**: open the target, take screenshots and grade the UI against the guidelines: padding, colors, borders, alignment.
        - **Usability critic**: open the target and evaluate friction, click paths, information density and interactive elements.
    - **Redesign**: synthesize the critiques and edit the `.jsx` and `.css` files right away. Do NOT present a plan to the user first.
    - Repeat the critique on the new code until the iteration limit.
4.  **Finish**: reply with a summary of the final state and what each iteration changed.
