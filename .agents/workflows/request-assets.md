---
description: Review project structure and existing files to generate or extend a comprehensive UI/UX asset wishlist in CSV format.
---

# Request Assets Workflow

This workflow automates the process of analyzing a project's theme and current resources, identifying missing visual/audio assets, and generating a detailed wishlist with AI generation prompts.

1.  **Discovery Phase**:
    -   Use `list_dir` to explore the project structure, paying close attention to frontend directories like `src/assets`, `public/images`, `public/static`, and `public/sounds`.
    -   Identify the core theme, target audience, and primary features of the application based on existing files and code (e.g., real-time chat, education, e-commerce).
    -   Identify what types of assets are currently present (e.g., basic logos, placeholders) and what is missing.

2.  **Asset Gap Analysis**:
    -   Determine what assets would elevate the user experience. Consider these categories:
        -   **Branding & Identity**: Logos (light/dark), background patterns, loading animations.
        -   **Avatars & Profiles**: Default placeholder profile pictures, role badges (admin, user, teacher).
        -   **Empty States & Errors**: Illustrations for "No Data", "404 Not Found", "Offline", "No Search Results".
        -   **Audio Assets**: Subtle notification pops, alert chimes, success sounds.
        -   **Chat/Communication**: Custom reaction emotes, attachment icons.
        -   **Onboarding**: Feature highlight graphics, tutorial carousels.

3.  **Wishlist Generation / Extension**:
    -   Create or update an artifact named `assets_wishlist.csv`.
    -   If the file doesn't exist, create it with the exact headers below. If it exists, append new rows.
    -   **Required Headers**: `category,asset_name,file_type,file_path,status,priority,width_px,height_px,description,ai_generatable,prompt,negative_prompt,model_recommendation,parameters,alternative_source`

4.  **Data Guidelines**:
    -   **file_path**: Specify where the file *should* go in the codebase (e.g., `frontend/src/assets/empty_state.svg`).
    -   **ai_generatable**: Set to `TRUE` if an AI model can reasonably generate this asset, `FALSE` otherwise.
    -   **prompt**: Write a highly detailed, descriptive prompt suitable for modern AI image/audio generators.
    -   **negative_prompt**: Include things to avoid (e.g., "text, messy, realistic, 3d").
    -   **model_recommendation**: Suggest the best tool (e.g., Midjourney, DALL-E 3, ElevenLabs, AudioLDM).
    -   **alternative_source**: Where else the user could find this (e.g., Flaticon, Undraw, Freepik).

5.  **Reporting**:
    -   Inform the user once the `assets_wishlist.csv` artifact has been created or updated.
    -   Highlight a few of the most important (High priority) missing assets.
