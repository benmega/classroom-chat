import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "dev_users.db")
DB_PATH = os.path.abspath(DB_PATH)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("UPDATE alembic_version SET version_num = '3a10e78a7fd0'")
conn.commit()
c.execute("SELECT version_num FROM alembic_version")
print("Alembic version updated to:", c.fetchall())
conn.close()
