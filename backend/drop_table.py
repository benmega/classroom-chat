import sqlite3
conn = sqlite3.connect("instance/dev_users.db")
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS standard_projects")
conn.commit()
conn.close()
