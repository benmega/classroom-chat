import sqlite3

def upgrade_users_table():
    conn = sqlite3.connect('instance/dev_users.db')
    cursor = conn.cursor()
    columns_to_add = [
        'has_chat_font',
        'has_animated_border',
        'has_golden_glow',
        'has_custom_wallpaper',
        'has_auto_claimer'
    ]
    for col in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} BOOLEAN DEFAULT 0;")
            print(f"Added {col} to users table.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col} already exists.")
            else:
                raise e
    conn.commit()
    conn.close()

if __name__ == '__main__':
    upgrade_users_table()
