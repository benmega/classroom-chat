# replace_achievements.py
# Summary: Clears achievements table in target DB and replaces it with rows from source DB.

import sqlite3
import shutil

TARGET_DB = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"
SOURCE_DB = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\migration\dev_users (classroom-chat).db"

def replace_table(source_db, target_db, table):
    # Connect to source and target
    src_conn = sqlite3.connect(source_db)
    tgt_conn = sqlite3.connect(target_db)

    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()

    try:
        # Get columns from source table
        src_cur.execute(f"PRAGMA table_info({table});")
        cols = [row[1] for row in src_cur.fetchall()]
        col_list = ", ".join(cols)
        placeholders = ", ".join(["?"] * len(cols))

        # Fetch source rows
        src_cur.execute(f"SELECT {col_list} FROM {table}")
        rows = src_cur.fetchall()

        # Clear target table
        tgt_cur.execute(f"DELETE FROM {table}")

        # Insert new rows
        tgt_cur.executemany(
            f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})", rows
)
        tgt_conn.commit()
        print(f"Replaced {table} with {len(rows)} rows from source.")
    except Exception as e:
        print("Error:", e)
    finally:
        src_conn.close()
        tgt_conn.close()

if __name__ == "__main__":
    # Backup target first
    shutil.copy(TARGET_DB, TARGET_DB + ".bak")

    replace_table(SOURCE_DB, TARGET_DB, "achievement")
