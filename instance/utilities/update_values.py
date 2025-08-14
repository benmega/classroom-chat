# import sqlite3
#
#
# def update_column_values(db_path, table_name, column_name, transform_function):
#     """
#     Update values in a specified column for all rows in a SQLite table using a transformation function.
#
#     :param db_path: Path to the SQLite database file.
#     :param table_name: Name of the table to update.
#     :param column_name: Name of the column to update.
#     :param transform_function: A function that takes a value and returns the transformed value.
#     """
#     # Connect to the SQLite database
#     conn = sqlite3.connect(db_path)
#     cursor = conn.cursor()
#
#     try:
#         # Fetch current values from the specified column
#         cursor.execute(f"SELECT rowid, {column_name} FROM {table_name}")
#         rows = cursor.fetchall()
#
#         # Apply the transformation function and update the table
#         for rowid, value in rows:
#             new_value = transform_function(value)
#             cursor.execute(f"""
#                 UPDATE {table_name}
#                 SET {column_name} = ?
#                 WHERE rowid = ?
#             """, (new_value, rowid))
#
#         # Commit the changes
#         conn.commit()
#         print(f"Updated values in column '{column_name}' of table '{table_name}'.")
#     except Exception as e:
#         print("Error occurred:", e)
#     finally:
#         conn.close()
#
#
def copy_column_values(db_path, table_name, source_column, target_column):
    """
    Copy values from one column to another within a SQLite table.

    :param db_path: Path to the SQLite database file.
    :param table_name: Name of the table to update.
    :param source_column: Name of the column to copy from.
    :param target_column: Name of the column to copy to.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(f"""
            UPDATE {table_name}
            SET {target_column} = {source_column}
        """)
        conn.commit()
        print(f"Copied '{source_column}' values into '{target_column}' in table '{table_name}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()
#
#
# if __name__ == "__main__":
#     database_path = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"
#
#     # Copy username into nickname for all rows in the user table
#     copy_column_values(
#         db_path=database_path,
#         table_name="users",
#         source_column="username",
#         target_column="nickname"
#     )
#
#

import sqlite3

# Your mapping
students = {
    "blossomstudent00": "MegaStudent00",
    "blossomstudent01": "Phu",
    "blossomstudent02": "Phat",
    "blossomstudent03": "Fah",
    "blossomstudent04": "Like",
    "blossomstudent05": "Poom",
    "blossomstudent06": "Thanhminh",
    "blossomstudent07": "Estelle",
    "blossomstudent08": "Yuu Yuu",
    "blossomstudent09": "Bpao",
    "blossomstudent10": "Pim",
    "blossomstudent11": "Nymph",
    "blossomstudent12": "Bunny",
    "blossomstudent14": "Win",
    "blossomstudent15": "Saen",
    "blossomstudent16": "Time",
    "blossomstudent17": "Anda",
    "blossomstudent18": "Tepun",
    "blossomstudent19": "Eugene",
    "blossomstudent23": "Lee",
    "blossomstudent24": "Chan",
    "blossomstudent25": "Suer",
    "blossomstudent26": "Thames2",
    "blossomstudent27": "Fuji",
    "blossomstudent30": "Nont",
    "blossomstudent31": "Trevi",
    "blossomstudent32": "Venice",
    "blossomstudent33": "lookpeach",
    "blossomstudent34": "Namo",
    "blossomstudent35": "Jinn",
    "blossomstudent36": "Indy",
    "blossomstudent37": "Mike",
    "blossomstudent38": "Cooper",
    "blossomstudent39": "Pinjia",
    "blossomstudent40": "Chuda",
    "blossomstudent41": "Rawit",
    "blossomstudent42": "TinTin",
    "blossomstudent43": "Jerlene",
    "blossomstudent44": "Phayu",
    "blossomstudent45": "Reva",
    "blossomstudent46": "Plawan",
    "blossomstudent47": "LookBua",
    "blossomstudent48": "Vin",
    "blossomstudent49": "Pluem",
    "blossomstudent50": "Caylor",
    "blossomstudent51": "Alice",
    "blossomstudent52": "Trisha",
    "blossomstudent53": "Shuyana",
    "blossomstudent54": "Fuji2",
    "blossomstudent55": "Zhangsu",
    "blossomstudent56": "Wasu",
    "blossomstudent57": "MegaStudent57",
    "blossomstudent58": "Capt",
    "blossomstudent59": "Jaokhun",
    "blossomstudent60": "Sky",
    "blossomstudent61": "Poon",
    "blossomstudent62": "FujiP",
    "blossomstudent63": "Teetat",
    "blossomstudent64": "Shogul"
}

def update_nicknames_from_dict(db_path, table_name, column_name, mapping):
    """
    Updates a column's values based on a mapping dictionary.
    Only updates rows where the current value is a key in the mapping.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(f"SELECT rowid, {column_name} FROM {table_name}")
        rows = cursor.fetchall()

        updates = 0
        for rowid, value in rows:
            if value in mapping:
                cursor.execute(f"""
                    UPDATE {table_name}
                    SET {column_name} = ?
                    WHERE rowid = ?
                """, (mapping[value], rowid))
                updates += 1

        conn.commit()
        print(f"Updated {updates} rows in '{column_name}' of '{table_name}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    database_path = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"


    # Then update nicknames from mapping
    update_nicknames_from_dict(
        db_path=database_path,
        table_name="users",
        column_name="nickname",
        mapping=students
    )
