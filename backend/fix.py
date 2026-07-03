import os

achievements_py = 'application/models/achievements.py'
with open(achievements_py, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('class Achievement(db.Model):', 'class Achievement(db.Model):  # type: ignore[name-defined,misc]')
content = content.replace('class UserAchievement(db.Model):', 'class UserAchievement(db.Model):  # type: ignore[name-defined,misc]')
with open(achievements_py, 'w', encoding='utf-8') as f:
    f.write(content)

routes_py = 'application/routes/achievement_routes.py'
with open(routes_py, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(
    'badge_dir = os.path.join(\n            current_app.static_folder, "images", "achievement_badges"\n        )',
    'badge_dir = os.path.join(\n            str(current_app.static_folder), "images", "achievement_badges"\n        )'
)
content = content.replace(
    'ext = badge_file.filename.rsplit(".", 1)[1].lower()',
    'ext = (badge_file.filename or "").rsplit(".", 1)[1].lower()'
)
with open(routes_py, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced!")
