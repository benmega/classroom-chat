---
title: "Implement Native End-to-End (E2E) Testing"
status: "open"
priority: "medium"
labels: ["testing", "e2e"]
---

# Issue: Implement Native End-to-End (E2E) Testing

## Context
Following the testing system review (Issue #049), unit testing with Vitest has been established. The next phase is to implement native E2E testing to ensure critical user workflows are reliable.

## Goal
Establish a primary E2E testing boundary interface using a modern NodeJS-based framework (Playwright or Cypress).

## Actions
1. Initialize an official NodeJS-based Playwright or Cypress framework in the project root.
2. Map out critical user journeys:
   - Student submission flow.
   - User login and authentication persistence.
   - Admin panel core interactions.
3. Configure tests to automatically boot both backend (Python) and frontend (Vite) services before execution.
