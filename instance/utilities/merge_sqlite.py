"""
merge_sqlite.py
Type: Python script
Location: itance/utilities
Summary: Merge dev.db into prod.db, auto-add missing tables/columns, preserve critical columns configurable per table
"""

import sqlite3
import shutil
from pathlib import Path
import sys

# Configuration: table -> list of critical columns to preserve from prod
CRITICAL_COLUMNS = {
    "users": ["duck_balance"]  # add more columns as needed
    # "another_table": ["important_col1", "important_col2"]
}


def restore_critical_columns(cur: sqlite3.Cursor, table_name: str, columns: list):
    """
    Restore critical columns from prod_backup for a given table.
    """
    if not columns:
        return

    set_clauses = ", ".join([
        f"{col} = (SELECT {col} FROM prod_backup.{table_name} WHERE prod_backup.{table_name}.id = main.{table_name}.id)"
        for col in columns
    ])
    cur.execute(f"""
        UPDATE main.{table_name}
        SET {set_clauses}
        WHERE EXISTS (
            SELECT 1 FROM prod_backup.{table_name}
            WHERE prod_backup.{table_name}.id = main.{table_name}.id
***REMOVED***
    """)
    print(f"Restored critical columns for {table_name}: {columns}")


def merge_databases(dev_path: str, prod_path: str, backup: bool = True):
    dev_path = Path(dev_path)
    prod_path = Path(prod_path)

    if not dev_path.exists() or not prod_path.exists():
        raise FileNotFoundError("One or both database paths do not exist")

    # Backup prod before merging
    if backup:
        backup_path = prod_path.with_suffix(".backup.db")
        shutil.copy(prod_path, backup_path)
        print(f"Backup created at {backup_path}")

    conn = sqlite3.connect(prod_path)
    cur = conn.cursor()

    try:
        cur.execute(f"ATTACH DATABASE '{dev_path}' AS dev")
        cur.execute(f"ATTACH DATABASE '{backup_path}' AS prod_backup")

        # Step 0: create missing tables
        dev_tables = cur.execute(
            "SELECT name, sql FROM dev.sqlite_master WHERE type='table'"
***REMOVED***.fetchall()

        for table_name, create_sql in dev_tables:
            cur.execute(f"SELECT name FROM main.sqlite_master WHERE type='table' AND name='{table_name}'")
            if not cur.fetchone():
                print(f"Creating missing table {table_name}")
                cur.execute(create_sql)

        # Step 1: merge tables
        for table_name, _ in dev_tables:
            # Find columns in dev and prod
            dev_cols = [row[1] for row in cur.execute(f"PRAGMA dev.table_info({table_name})").fetchall()]
            prod_cols = [row[1] for row in cur.execute(f"PRAGMA main.table_info({table_name})").fetchall()]

            # Add missing columns to prod
            for col in dev_cols:
                if col not in prod_cols:
                    print(f"Adding missing column {col} to {table_name}")
                    cur.execute(f"ALTER TABLE main.{table_name} ADD COLUMN {col}")

            # Merge data
            print(f"Merging table {table_name}")
            col_list = ",".join(dev_cols)
            cur.execute(f"""
                INSERT OR REPLACE INTO main.{table_name} ({col_list})
                SELECT {col_list} FROM dev.{table_name}
            """)

            # Restore critical columns if configured
            if table_name in CRITICAL_COLUMNS:
                restore_critical_columns(cur, table_name, CRITICAL_COLUMNS[table_name])

        conn.commit()
        print("Merge completed successfully.")

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python merge_sqlite_auto_general.py dev.db prod.db")
        sys.exit(1)

    merge_databases(sys.argv[1], sys.argv[2])
