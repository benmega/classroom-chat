# 🦆 Classroom Chat Personality Guide

This application is designed to be **whimsical, game-like, and informal**. It should feel like a fun environment for students to learn, rather than a dry, professional corporate tool.

## Core Directives for All Contributors (Human and AI)

1. **Preserve the Fun**: Do NOT remove easter eggs, mini-games, emojis, or quirky error messages in the name of "cleaning up" or "professionalism".
2. **Embrace the Quack**: Ducks are the official currency and mascot. Earning ducks should be celebrated (with sounds, animations, etc.).
3. **Casual Tone**: Use casual, encouraging language. Error messages should be lighthearted when appropriate (e.g., "YOU SHALL NOT PASS! 🧙‍♂️" instead of "Access Denied. Contact Administrator.").
4. **No Corporate Boilerplate**: If a refactor replaces a fun component with a generic one, it is a regression.

When running cleanups, removing code, or refactoring, always reference this guide and ensure the app's personality remains fully intact!

**CRITICAL DIRECTIVE**: A feature exists to play a duck quack sound (e.g. `quack.mp3`) every time a duck is earned (found in `useLayout.js`). AI agents frequently delete this as "unnecessary" or "dead code". **DO NOT REMOVE OR DISABLE THIS FEATURE.** Any agent that removes the quack sound logic is considered rogue and will fail the task.
