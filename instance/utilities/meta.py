# db_metadata.py
# Type: Script
# Location: Local (runs anywhere Python and sqlite3 are available)
# Summary: Connects to a SQLite database and prints its metadata (tables, columns, indexes).

import sqlite3

DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"


def get_metadata():
    """Prints metadata for all tables in the database."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        # List all tables
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cur.fetchall()]
        print(f"Tables ({len(tables)}): {tables}\n")

        for table in tables:
            print(f"Table: {table}")

            # Get columns and types
            cur.execute(f"PRAGMA table_info({table});")
            columns = cur.fetchall()
            print("Columns:")
            for col in columns:
                cid, name, col_type, notnull, dflt_value, pk = col
                print(
                    f"  {name} ({col_type}), NOT NULL={bool(notnull)}, PK={bool(pk)}, Default={dflt_value}"
                )

            # Get indexes
            cur.execute(f"PRAGMA index_list({table});")
            indexes = cur.fetchall()
            if indexes:
                print("Indexes:")
                for idx in indexes:
                    seq, name, unique, origin, partial = idx
                    print(
                        f"  {name}, Unique={bool(unique)}, Origin={origin}, Partial={bool(partial)}"
                    )
            print("-" * 40)

    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    get_metadata()
