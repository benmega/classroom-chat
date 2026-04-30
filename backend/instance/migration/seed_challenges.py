import csv
import os
import re

def generate_kebab_slug(text):
    """Generate a clean kebab-case slug."""
    if not text:
        return ""
    # Remove "- Locked" suffix commonly found in Ozaria data
    text = text.replace(" - Locked", "")
    # Lowercase, replace spaces/underscores with dashes
    slug = re.sub(r'[_\s]+', '-', text.lower())
    # Remove non-alphanumeric (except dashes)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Collapse multiple dashes
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug

def seed_challenges_data(conn, seed_file_path):
    """
    Robustly restores challenge data:
    1. Updates existing challenges from CSV.
    2. Inserts missing challenges from CSV.
    3. Fixes 'corrupted' slugs (non-kebab) in challenges and challenge_logs.
    4. Normalizes difficulty levels.
    """
    if not os.path.exists(seed_file_path):
        print(f"Seed Notice: Challenges seed file not found at {seed_file_path}. Skipping.")
        return

    cursor = conn.cursor()

    # Ensure tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='challenges';")
    if not cursor.fetchone():
        print("Seed Error: 'challenges' table does not exist.")
        return

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='challenge_logs';")
    has_logs_table = cursor.fetchone() is not None

    print(f"Restoration: Processing seed file {seed_file_path}...")

    updated_count = 0
    inserted_count = 0
    slug_fix_count = 0

    # 1. Process Seed File (Updates and Inserts)
    try:
        with open(seed_file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get('name', '').strip()
                domain = row.get('domain', '').strip()
                if not name or not domain:
                    continue

                csv_slug = row.get('slug', '').strip() or generate_kebab_slug(name)
                difficulty = row.get('difficulty', 'medium').capitalize()
                value = row.get('value', 1)
                description = row.get('description', 'No description provided.')
                course_id = row.get('course_id')

                # Check if exists
                cursor.execute("SELECT slug FROM challenges WHERE name = ? AND domain = ?", (name, domain))
                res = cursor.fetchone()

                if res:
                    old_slug = res[0]
                    # Update existing record
                    cursor.execute(
                        """
                        UPDATE challenges 
                        SET slug = ?, difficulty = ?, value = ?, description = ?, course_id = ?
                        WHERE name = ? AND domain = ?
                        """,
                        (csv_slug, difficulty, value, description, course_id, name, domain)
                    )
                    if cursor.rowcount > 0:
                        updated_count += 1
                        # If slug changed, update logs
                        if old_slug != csv_slug and has_logs_table:
                            cursor.execute(
                                "UPDATE challenge_logs SET challenge_slug = ? WHERE challenge_slug = ? AND domain = ?",
                                (csv_slug, old_slug, domain)
                            )
                else:
                    # Insert new record
                    cursor.execute(
                        """
                        INSERT INTO challenges (
                            name, slug, domain, course_id, description, 
                            difficulty, value, is_active, created_at
                        ) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                        """,
                        (name, csv_slug, domain, course_id, description, difficulty, value)
                    )
                    inserted_count += 1

        conn.commit()
        print(f"Seed: Result - {inserted_count} inserted, {updated_count} updated from CSV.")

    except Exception as e:
        conn.rollback()
        print(f"Seed Error (CSV Processing): {e}")
        return

    # 2. Cleanup existing data (Fix slugs for rows NOT in CSV)
    try:
        # Find all challenges where slug is NOT in kebab-case (contains spaces or uppercase or equals name but name has spaces)
        # We'll just look for slugs that contain spaces or don't match our slug generation logic
        cursor.execute("SELECT id, name, slug, domain FROM challenges")
        all_challenges = cursor.fetchall()

        for cid, name, slug, domain in all_challenges:
            expected_slug = generate_kebab_slug(slug) # Use the slug itself as base if it exists, or name
            if not expected_slug:
                expected_slug = generate_kebab_slug(name)
            
            if slug != expected_slug:
                # Update slug
                cursor.execute("UPDATE challenges SET slug = ? WHERE id = ?", (expected_slug, cid))
                slug_fix_count += 1
                
                # Update logs
                if has_logs_table:
                    cursor.execute(
                        "UPDATE challenge_logs SET challenge_slug = ? WHERE challenge_slug = ? AND domain = ?",
                        (expected_slug, slug, domain)
                    )

        conn.commit()
        print(f"Data Cleanup: Fixed {slug_fix_count} slugs in challenges and logs.")

    except Exception as e:
        conn.rollback()
        print(f"Seed Error (Slug Cleanup): {e}")

    # 3. Normalize Difficulty (Ensure Capitalized)
    try:
        cursor.execute("UPDATE challenges SET difficulty = 'Easy' WHERE LOWER(difficulty) = 'easy'")
        cursor.execute("UPDATE challenges SET difficulty = 'Medium' WHERE LOWER(difficulty) = 'medium'")
        cursor.execute("UPDATE challenges SET difficulty = 'Hard' WHERE LOWER(difficulty) = 'hard'")
        conn.commit()
        print("Data Cleanup: Normalized difficulty levels.")
    except Exception as e:
        conn.rollback()
        print(f"Seed Error (Difficulty Normalization): {e}")