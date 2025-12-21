# Filename: add_achievements.py
# Description: Bulk insert achievements from a CSV into the database.

import csv

from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.achievements import Achievement

CSV_PATH = r"C:\Users\Ben\OneDrive\Desktop\achievement.csv"


def seed_achievements():
    inserted, skipped = 0, 0

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data = {
                "slug": row["slug"],
                "name": row["name"],
                "description": row["description"],
                "type": row["type"],
                "requirement_value": row["requirement_value"],
                "source": row.get("source"),  # optional column
                "reward": int(row.get("reward", 0)),
            }

            if not Achievement.query.filter_by(slug=data["slug"]).first():
                db.session.add(Achievement(**data))
                inserted += 1
            else:
                skipped += 1

    db.session.commit()
    print(f"Inserted: {inserted}, Skipped: {skipped}")


def main():
    app = create_app(DevelopmentConfig)
    with app.app_context():
        seed_achievements()


if __name__ == "__main__":
    main()
