import sqlite3
import os

db_path = r'c:\Users\Ben\AntiGravity\classroom-chat\backend\instance\dev_users.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = ['users', 'conversations', 'messages', 'classrooms']

for table in tables:
    print(f"\nChecking table: {table}")
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    
    # SQLite PRAGMA table_info returns (id, name, type, notnull, dflt_value, pk)
    # We want columns with type containing 'DATE' or 'TIME'
    date_cols = [col[1] for col in columns if 'DATE' in col[2].upper() or 'TIME' in col[2].upper()]
    
    if not date_cols:
        print(f"  No date/time columns found.")
        continue
        
    for col in date_cols:
        print(f"  Checking column: {col}")
        # Need to handle 'id' column name carefully if it's not 'id' (e.g. classrooms table uses 'id' but as VARCHAR)
        # Check if table has an 'id' column
        id_col = 'id' if any(c[1] == 'id' for c in columns) else columns[0][1]
        
        cursor.execute(f"SELECT {id_col}, {col} FROM {table}")
        rows = cursor.fetchall()
        
        bad_rows = []
        for r_id, val in rows:
            if val is not None and not isinstance(val, str):
                bad_rows.append((r_id, val))
        
        if bad_rows:
            print(f"    FOUND {len(bad_rows)} bad values in {table}.{col}:")
            for br in bad_rows[:10]:
                print(f"      ID: {br[0]}, Value: {br[1]} (type: {type(br[1])})")
            
            # Fix it! Set to NULL
            print(f"    Fixing {len(bad_rows)} rows in {table}.{col}...")
            cursor.execute(f"UPDATE {table} SET {col} = NULL WHERE typeof({col}) != 'text' AND {col} IS NOT NULL")
            print(f"    Fixed.")

conn.commit()
conn.close()
print("\nDatabase cleanup complete.")
