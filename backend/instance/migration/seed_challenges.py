import csv
import os

def seed_challenges_data(conn, seed_file_path):
    """
    Reads the challenge seed data CSV and inserts new records into the
    challenges table, skipping any existing duplicates.
    """
    if not os.path.exists(seed_file_path):
        print(f"Seed Notice: Challenges seed file not found at {seed_file_path}. Skipping.")
        return

    cursor = conn.cursor()

    # Ensure the target table exists before seeding
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='challenges';")
    if not cursor.fetchone():
        print("Seed Error: 'challenges' table does not exist. Skipping seed.")
        return

    inserted_count = 0
    skipped_count = 0

    try:
        with open(seed_file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                name = row.get('name', '').strip()
                domain = row.get('domain', '').strip()
                slug = row.get('slug', '').strip() or name  # Mimic SQLAlchemy @listens_for

                # Watch for duplicates: Check if a challenge with this name and domain already exists
                cursor.execute("SELECT 1 FROM challenges WHERE name = ? AND domain = ?", (name, domain))
                if cursor.fetchone():
                    skipped_count += 1
                    continue

                # Insert new challenge, explicitly defining DB-required defaults
                cursor.execute(
                    """
                    INSERT INTO challenges (
                        name, slug, domain, course_id, description, 
                        difficulty, value, is_active, created_at
                    ) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                    """,
                    (
                        name,
                        slug,
                        domain,
                        row.get('course_id'),
                        row.get('description'),
                        row.get('difficulty', 'medium'),
                        row.get('value', 1)
                    )
                )
                inserted_count += 1

        conn.commit()
        print(f"Seed: Inserted {inserted_count} new challenges. Skipped {skipped_count} duplicates.")

    except Exception as e:
        conn.rollback()
        print(f"Seed Error (Challenges): {e}")