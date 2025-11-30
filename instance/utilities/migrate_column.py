# sync_duck_balance.py
# Summary: Copies earned_ducks from source DB to duck_balance in target DB by user ID.

import sqlite3
import shutil

TARGET_DB = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"
SOURCE_DB = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\migration\dev_users (classroom-chat).db"

def sync_duck_balance(source_db, target_db):
    # Backup target
    shutil.copy(target_db, target_db + ".bak")

    src_conn = sqlite3.connect(source_db)
    tgt_conn = sqlite3.connect(target_db)

    try:
        src_cur = src_conn.cursor()
        tgt_cur = tgt_conn.cursor()

        # Fetch all user ids and earned_ducks from source
        src_cur.execute("SELECT id, ducks FROM users")
        rows = src_cur.fetchall()

        # Update target DB
        for user_id, earned in rows:
            tgt_cur.execute(
                "UPDATE users SET duck_balance = ? WHERE id = ?",
                (earned, user_id)
    )

        tgt_conn.commit()
        print(f"Updated duck_balance for {len(rows)} users.")
    except Exception as e:
        print("Error:", e)
    finally:
        src_conn.close()
        tgt_conn.close()

if __name__ == "__main__":
    sync_duck_balance(SOURCE_DB, TARGET_DB)
