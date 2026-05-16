# ISSUE-006: Business and UI Logic Leaking into `User` Model

## Description
The `User` model (`backend/application/models/user.py`) contains complex logic that goes beyond simple data persistence. Specifically, logic for generating GitHub-style contribution graphs and calculating domain-specific progress percentages is implemented directly in the model.

## Identified Smells:
1.  **UI Logic in Model:** `get_contribution_data` calculates spans, month names, and grid levels specifically for a frontend visualization.
2.  **Domain Knowledge Leakage:** The `User` model has hardcoded knowledge of "codecombat.com" and "www.ozaria.com" progress calculation.
3.  **Expensive `to_dict`:** The default `to_dict` method calls these expensive logic functions, making it risky to use in list views (hence the need for `to_dict_summary`).
4.  **Circular Import Workarounds:** Methods use local imports (e.g., `from .challenge import Challenge`) to avoid circular dependencies, indicating high coupling.

## Impact
- **Violates Single Responsibility Principle:** The model should only handle data and basic relationships.
- **Performance Risks:** Implicitly calling expensive UI logic during serialization can cause slow API responses.
- **Testing Difficulty:** Testing the model requires setting up complex state for UI-related functions.

## Proposed Solution
- Extract contribution graph logic to a `UserService` or `AnalyticsService`.
- Move progress calculation logic to a `ProgressService` or similar.
- Use a **Serialization Layer** (like Marshmallow or simple DTOs) instead of `to_dict` methods on the model to handle different view requirements.
- Decouple the `User` model from specific domain identifiers like "codecombat.com".

## Related Files
- `backend/application/models/user.py`
