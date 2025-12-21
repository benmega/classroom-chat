# run_sql.py
# Type: Script
# Location: Local (runs anywhere Python and sqlite3 are available)
# Summary: Opens a SQLite database, runs custom SQL, prints results.

import sqlite3

DB_PATH = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"


def run_sql(sql: str, params: tuple = ()):
    """Run custom SQL on the database and print results."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        if sql.strip().lower().startswith("select"):
            rows = cur.fetchall()
            for row in rows:
                print(row)
        else:
            conn.commit()
            print("Success.")
    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()


def run_sql2(sql: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.executescript(sql)  # handles multiple statements + semicolons
        conn.commit()
        print("Success.")
    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    sql = """
        SELECT * FROM challenge_logs WHERE username = "blossomstudent44"
    """
    run_sql(sql)  # use run_sql for SELECT statements
