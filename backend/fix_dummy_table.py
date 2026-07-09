import sqlite3
import glob

for db_path in glob.glob("instance/*.db"):
    print("Fixing", db_path)
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    try:
        c.execute("CREATE TABLE parent_connection_requests (id INTEGER PRIMARY KEY);")
        print("Created parent_connection_requests in", db_path)
    except Exception as e:
        print("Error:", e)
    conn.commit()
    conn.close()
