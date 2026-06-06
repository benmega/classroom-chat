import sqlite3
conn = sqlite3.connect('instance/dev_users.db')
c = conn.cursor()
c.execute("SELECT username, role FROM users WHERE username='test_parent'")
print(c.fetchall())
