# Admin: Achievement Sprite Sheet Rebuild Failure

## Description
The backend fails to rebuild the achievement icon sprite sheet when a new achievement is added because it relies on a brittle `subprocess.run` call that doesn't account for varying environments or script locations.

## Details
In `achievement_routes.py`, line 147 attempts to run `python make_sprite_sheet.py`. If `python` is not in the PATH or if the script is moved, it fails silently or throws an error that isn't surfaced properly to the admin.

## Steps to Reproduce
1. Go to Admin -> Achievements.
2. Create a new achievement with a badge icon.
3. Observe that the new icon does not appear in the student's achievement view even after a reload.

## Expected Result
The sprite sheet should be rebuilt and the new icon should be available immediately.

## Actual Result
Icon rebuild fails silently.

## Impact
Minor - Achievement icons remain broken until manual intervention.

## Root Cause
Using a hardcoded 'python' executable in subprocess.run which could fail if not in PATH. Fixed by using sys.executable and returning the error via JSON.
## Changed Files
- backend/application/routes/achievement_routes.py
