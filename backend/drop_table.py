import sqlite3
conn = sqlite3.connect("instance/dev_users.db")
c = conn.cursor()
c.execute("DROP TABLE track_change_requests")
conn.commit()
conn.close()
