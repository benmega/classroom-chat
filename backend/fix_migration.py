import sqlite3
import glob

for db_path in glob.glob("instance/*.db"):
    print("Checking", db_path)
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    try:
        c.execute("DELETE FROM alembic_version")
        print("Deleted alembic_version from", db_path)
    except Exception as e:
        print("Error:", e)
    conn.commit()
    conn.close()
else:
    print("DB not found at", db_path)
