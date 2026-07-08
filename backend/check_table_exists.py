import sqlite3

conn = sqlite3.connect("instance/dev_users.db")
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print("Tables in dev_users.db:", tables)
conn.close()
