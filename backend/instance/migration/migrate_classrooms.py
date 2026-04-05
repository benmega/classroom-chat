def migrate_classrooms_and_instances(conn):
    """
    Splits the old course_instances (classroom data) into separate
    classrooms and course_instances tables.
    """
    cursor = conn.cursor()

    # 1. Check if we need to migrate
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row[0] for row in cursor.fetchall()}

    # If 'classrooms' already exists, we assume migration is done
    if "classrooms" in tables:
        print("Migration: 'classrooms' table already exists. Skipping.")
        return

    if "course_instances" not in tables:
        print("Migration Error: 'course_instances' table not found to migrate from.")
        return

    try:
        print("Migration: Splitting 'course_instances' into Classrooms and Instances...")

        # 2. Rename the old table (which has classroom data) to 'classrooms'
        cursor.execute("ALTER TABLE course_instances RENAME TO classrooms;")

        # 3. Create the NEW 'course_instances' table with the correct schema
        # This table links a Classroom to a Course
        cursor.execute("""
            CREATE TABLE course_instances (
                id TEXT PRIMARY KEY,
                classroom_id TEXT NOT NULL,
                course_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (classroom_id) REFERENCES classrooms (id),
                FOREIGN KEY (course_id) REFERENCES courses (id)
            );
        """)

        # 4. Cleanup the 'classrooms' table
        # Since it was originally the course_instances table, it might have
        # a course_id column that we no longer need there (optional but cleaner)
        # Note: SQLite doesn't support DROP COLUMN in very old versions,
        # so we just leave it or rename it if necessary.

        conn.commit()
        print("Migration: Successfully created 'classrooms' and reset 'course_instances'.")

    except Exception as e:
        conn.rollback()
        print(f"Migration Error: {e}")


if __name__ == "__main__":
    # For testing locally
    pass
