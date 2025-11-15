import sqlite3
# Updated 11.8.25
DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"

# Required tables
# Required tables
REQUIRED_TABLES = {
    "store_items": """
        CREATE TABLE store_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            base_price REAL NOT NULL,
            description TEXT NOT NULL,
            fulfillment_type TEXT NOT NULL DEFAULT 'physical'
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
        # Add more columns here, e.g.:
        # ("approved_by", "TEXT", "NULL"),
    ] ,
    "users": [("last_daily_duck", "DATETIME", "NULL")
    ]
}

# Seed data
# Assuming this script can import the enum from your models
from application.models.store_item import FulfillmentType

# Seed data
# (name, description, base_price, fulfillment_type)
STORE_SEED = [
    ("Custom Print (Random Color)",
     "A token redeemable for one small, pre-approved 3D model printed in the filament currently loaded.",
     2,
     FulfillmentType.CUSTOM_INFO), # Requires user to specify a model
    ("Custom Print (Chosen Color)",
     "A token redeemable for one small, pre-approved 3D model in a student-chosen available filament color.",
     3,
     FulfillmentType.CUSTOM_INFO), # Requires user to specify model + color
    ("AA Battery", "A fresh pair of AA batteries.", 50, FulfillmentType.PHYSICAL),
    ("AAA Battery", "A fresh pair of AAA batteries.", 50, FulfillmentType.PHYSICAL),
    ("Type C Charger Rental", "A 1-period loan of a USB-C laptop charger.", 1, FulfillmentType.PHYSICAL),
    ("Mouse Rental", "A 1-period loan of an ergonomic or gaming mouse.", 1, FulfillmentType.PHYSICAL),
    ("Debug Assistance", "A simple bug fix.", 1, FulfillmentType.PHYSICAL), # Manual admin action
    ("Double_Ducks_Day", "A special day where everyone gets a double ducks!", 500, FulfillmentType.AUTOMATED),
    ("Computer_Cleanup", "Teacher performs full desktop cleanup at the end of class.", 2, FulfillmentType.PHYSICAL),
    ("Custom_Wallpaper", "Choose a custom desktop wallpaper.", 200, FulfillmentType.AUTOMATED), # System grants perk
    ("Chat_Font", "Custom font in chat.", 100, FulfillmentType.AUTOMATED), # System grants perk
    ("Teacher's Chair", "Sit in Mr. Mega's chair for the period.", 500, FulfillmentType.PHYSICAL),
    ("New Duck Color", "A new 3D-printed duck color of your choice!", 500, FulfillmentType.CUSTOM_INFO), # Requires info
    ("Skip-a-Level", "Skip one CodeCombat or Ozaria level.", 20, FulfillmentType.PHYSICAL), # Manual redemption
    ("Flexible Seating Pass", "Work anywhere in the room (except Mr. Mega's area) for one period.", 20, FulfillmentType.PHYSICAL),
    ("Bathroom Break", "Free restroom pass. Max one per student per class.", 5, FulfillmentType.PHYSICAL),
    ("Headphones Rental", "A 1-period loan of headphones.", 1, FulfillmentType.PHYSICAL),
    ("DJ_for_15_Mins", "Choose school-appropriate music for 15 minutes.", 20, FulfillmentType.PHYSICAL),
    ("First_To_Leave_Pass", "No one will leave before you. First come, first serve.", 10, FulfillmentType.PHYSICAL),
    ("Positive_Shout_Out", "Teacher gives a formal positive shout-out.", 5, FulfillmentType.PHYSICAL),
    ("Auto_Challenge_Claimer", "Bookmarklet for claiming CodeCombat/Ozaria levels.", 10, FulfillmentType.AUTOMATED) # System grants item
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

        # --- FIX #2 ---
        # Convert enum objects to their string .value for the database
        processed_seed = [
            (name, desc, price, f_type.value)
            for name, desc, price, f_type in STORE_SEED
        ]

        # --- FIX #1 ---
        # Added the 4th placeholder for fulfillment_type
        cursor.executemany(
            "INSERT INTO store_items (name, description, base_price, fulfillment_type) VALUES (?, ?, ?, ?);",
            processed_seed  # Use the new processed list
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
