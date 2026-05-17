# ISSUE-007: God Object Pattern in Backend Application Initialization

## Description
The `backend/application/__init__.py` file (specifically the `create_app` function) has become a "God Object" that manages almost every aspect of the application's startup. It spans over 250 lines and handles logging, configuration, extensions, routes, error handlers, and even database seeding.

## Identified Smells:
1.  **Too Many Responsibilities:** Logging setup, environment detection, Flask-CORS, ProxyFix, license loading, extension initialization, blueprint registration, task scheduling, database creation, schema drift checking, and seeding are all in one function.
2.  **Hardcoded Configuration:** CORS origins and other defaults are hardcoded in the function instead of being solely in `config.py`.
3.  **Complex Conditional Logic:** Significant logic for production vs development environments is branched throughout the function.

## Impact
- **Difficult to Test:** Testing individual components of the app startup is impossible without running the entire `create_app`.
- **Low Maintainability:** Changes to logging or database seeding require touching the main entry point of the application.
- **Boot Time Inefficiency:** Seeding logic and schema checks are run synchronously during app creation.

## Proposed Solution
- Extract **Logging setup** to a dedicated `logging_config.py`.
- Extract **Extension initialization** to `extensions.py` (it already exists but could be more self-contained).
- Extract **Seeding logic** to a separate script or a dedicated service module.
- Move all **CORS and Proxy settings** to the `Config` classes.
- Create small, focused initialization functions (e.g., `init_error_handlers(app)`, `init_logging(app)`) to be called from `create_app`.

## Related Files
- `backend/application/__init__.py`
- `backend/application/config.py`
