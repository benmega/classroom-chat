import sqlite3

conn = sqlite3.connect('../users.db')
cursor = conn.cursor()

# Fetch and print the schema of the 'user' table
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()

print("Columns in 'users' table:")
for column in columns:
    print(column)

conn.close()
