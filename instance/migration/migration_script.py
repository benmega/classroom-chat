import sqlite3

DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"

# Required tables
REQUIRED_TABLES = {
    "store_items": """
        CREATE TABLE store_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            base_price REAL NOT NULL,
            description TEXT NOT NULL
***REMOVED***;
    """,
    "user_item_purchases": """
        CREATE TABLE user_item_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            times_purchased INTEGER NOT NULL DEFAULT 0,
            last_purchase DATETIME,
            FOREIGN KEY(item_id) REFERENCES store_items(id)
***REMOVED***;
    """
}

# Column migrations
MIGRATIONS = {
    "user_certificate": [
        ("reviewed", "INTEGER", 0),
        ("reviewed_at", "DATETIME", "NULL")
    ]
}

# Seed data
STORE_SEED = [
    ("Custom Print (Random Color)",
     "A token redeemable for one small, pre-approved 3D model printed in the filament currently loaded.",
     2),
    ("Custom Print (Chosen Color)",
     "A token redeemable for one small, pre-approved 3D model in a student-chosen available filament color.",
     3),
    ("AA Battery", "A fresh pair of AA batteries.", 50),
    ("AAA Battery", "A fresh pair of AAA batteries.", 50),
    ("Type C Charger Rental", "A 1-period loan of a USB-C laptop charger.", 1),
    ("Mouse Rental", "A 1-period loan of an ergonomic or gaming mouse.", 1),
    ("Debug Assistance", "A 10-minute 1:1 debugging session.", 1),
    ("Double_Ducks_Day", "A special day where everyone gets a rubber duck.", 500),
    ("Computer_Cleanup", "Teacher performs full desktop cleanup and optimization.", 2),
    ("Custom_Wallpaper", "Student chooses a custom desktop wallpaper.", 200),
    ("Chat_Font", "Temporary custom font in editor or chat for one class.", 100),
    ("Teacher's Chair", "Use the teacher's ergonomic chair for the period.", 500),
    ("New Duck Color", "A new 3D-printed debug duck color or design.", 500),
    ("Skip-a-Level", "Skip one CodeCombat or Ozaria level after a real attempt.", 10),
    ("Flexible Seating Pass", "Work anywhere in the room for one period.", 20),
    ("Bathroom Break", "Free restroom pass. Max two per session.", 5),
    ("Headphones Rental", "A 1-period loan of headphones.", 1),
    ("DJ_for_15_Mins", "Choose school-appropriate music for 15 minutes.", 20),
    ("First_To_Leave_Pass", "Dismiss 90 seconds before the bell.", 10),
    ("Positive_Shout_Out", "Teacher gives a formal positive shout-out.", 5),
    ("Auto_Challenge_Claimer", "Bookmarklet for claiming CodeCombat/Ozaria levels.", 10),
]


def column_exists(conn, table, column):
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table});")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(conn, table):
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    return any(row[0] == table for row in cursor.fetchall())


def table_empty(conn, table):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table};")
    return cur.fetchone()[0] == 0


def create_table(conn, table_name, ddl):
    cursor = conn.cursor()
    cursor.execute(ddl)
    conn.commit()
    print(f"Created table '{table_name}'")


def add_column(conn, table, column, column_type, default_value):
    cursor = conn.cursor()
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"
    if default_value is not None:
        sql += f" DEFAULT {default_value}"
    sql += ";"
    cursor.execute(sql)
    conn.commit()
    print(f"Added '{column}' to '{table}' with default {default_value}")


def run_migrations():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Ensure required tables exist
    for table_name, ddl in REQUIRED_TABLES.items():
        if not table_exists(conn, table_name):
            create_table(conn, table_name, ddl)
        else:
            print(f"Table '{table_name}' already exists")

    # 2. Seed store_items if empty
    if table_exists(conn, "store_items") and table_empty(conn, "store_items"):
        cursor.executemany(
            "INSERT INTO store_items (name, description, base_price) VALUES (?, ?, ?);",
            STORE_SEED
***REMOVED***
        conn.commit()
        print("Seeded store_items table")
    else:
        print("store_items already contains data or does not exist")

    # 3. Column migrations
    for table, columns in MIGRATIONS.items():
        if not table_exists(conn, table):
            print(f"Skipping '{table}' — table not found")
            continue

        for column_name, column_type, default_value in columns:
            if column_exists(conn, table, column_name):
                print(f"'{table}.{column_name}' already exists — skipped")
                continue

            try:
                add_column(conn, table, column_name, column_type, default_value)
            except Exception as e:
                print(f"Error adding '{column_name}' to '{table}': {e}")

    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run_migrations()
