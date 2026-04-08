---
name: Login Automation
description: Automatically log in to the application using admin or student credentials for testing.
---
# Login Automation Skill

This skill provides credentials and instructions to log in to the application via the browser for automated testing.

## Application Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `ben` | `rK@76E6P7z7E` |
| **Student** | `blossomstudent01` | `Bls01` |

## Automated Login Procedure

When an agent needs to log in, they should use the `browser_subagent` with the following parameters:

- **Target URL**: `http://localhost:5173/login`
- **Username Field Selector**: `#username`
- **Password Field Selector**: `#password`
- **Submit Button Selector**: `#login-submit-btn`

### Example Task for browser_subagent:

"Please navigate to `http://localhost:5173/login` and log in as the admin user. 
Use the username `ben` and password `rK@76E6P7z7E`. 
Click on the login button with ID `#login-submit-btn` and ensure you are redirected to the homepage."

> [!NOTE]
> If the login field selectors change, please update this skill accordingly.
