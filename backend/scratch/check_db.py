import sqlite3

def check():
    conn = sqlite3.connect('instance/dev_users.db')
    cursor = conn.cursor()
    
    # Get column names
    cursor.execute("PRAGMA table_info(user)")
    columns = [row[1] for row in cursor.fetchall()]
    print("Columns:", columns)
    
    # Select all users
    cursor.execute("SELECT * FROM user")
    rows = cursor.fetchall()
    
    print(f"Total user rows: {len(rows)}")
    for row in rows:
        user_dict = dict(zip(columns, row))
        uid = user_dict.get('id')
        username = user_dict.get('username')
        
        # Check all column types to see if any date/datetime column has an integer/float or boolean
        has_error = False
        details = []
        for col, val in user_dict.items():
            if val is not None:
                # We expect date/datetime columns to be strings, check if they are integer or boolean
                if col in ['created_at', 'updated_at', 'deleted_at', 'join_date', 'birthdate', 'last_login']:
                    if not isinstance(val, str):
                        has_error = True
                        details.append(f"{col}: {repr(val)} (type: {type(val).__name__})")
        
        if has_error or uid in [1, 2, 3]: # print some sample admins/students too
            print(f"\nUser ID: {uid}, Username: {username}")
            for col, val in user_dict.items():
                if val is not None and col in ['created_at', 'updated_at', 'join_date', 'birthdate', 'last_login']:
                    print(f"  {col}: {repr(val)} (type: {type(val).__name__})")
            if details:
                print("  --> LINT/TYPE ERRORS FOUND:")
                for d in details:
                    print(f"      {d}")

    conn.close()

if __name__ == '__main__':
    check()
