# Filename: export_database_tables.py
# Description: Script to export all database tables to CSV files in a human-readable format.

import os
import csv
import json
from datetime import datetime
from sqlalchemy import inspect, text
from application import create_app, DevelopmentConfig
from application.extensions import db

# --- PATH CONFIGURATION ---
# Calculate paths relative to this script file
# Script is in: /project/utilities/
# Backups go to: /project/backups/
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
BACKUPS_FOLDER = os.path.join(PROJECT_ROOT, 'backups')

def get_output_path(folder_name):
    """
    Helper to ensure the output path is inside the backups folder.
    """
    return os.path.join(BACKUPS_FOLDER, folder_name)

def export_tables_to_csv(output_dir=None):
    """
    Exports all tables in the database to CSV files.

    :param output_dir: Directory name. If None, creates a timestamped directory.
    :return: Path to the directory containing the exported files
    """
    # Create output directory name if not specified
    if output_dir is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir_name = f"db_export_{timestamp}"
    else:
        output_dir_name = output_dir

    # resolve absolute path to backups folder
    full_output_path = get_output_path(output_dir_name)

    # Create directory if it doesn't exist (os.makedirs creates intermediate dirs like 'backups')
    if not os.path.exists(full_output_path):
        os.makedirs(full_output_path)
        print(f"Created output directory: {full_output_path}")

    # Get database inspector
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    if not table_names:
        print("No tables found in database.")
        return full_output_path

    print(f"Found {len(table_names)} tables in the database.")
    exported_count = 0

    # Export each table
    for table_name in table_names:
        try:
            # Execute raw SQL to get all data from the table
            result = db.session.execute(text(f"SELECT * FROM {table_name}"))

            # Get column names
            columns = [col for col in result.keys()]

            # Convert result to list of dictionaries more safely
            rows = []
            for row in result:
                # Convert row object to dictionary using column names as keys
                row_dict = {}
                for i, column in enumerate(columns):
                    row_dict[column] = row[i]
                rows.append(row_dict)

            # Write to CSV
            file_path = os.path.join(full_output_path, f"{table_name}.csv")
            with open(file_path, 'w', newline='', encoding='utf-8') as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=columns)
                writer.writeheader()
                writer.writerows(rows)

            row_count = len(rows)
            exported_count += 1
            print(f"Exported table '{table_name}' with {row_count} rows to {file_path}")

        except Exception as e:
            print(f"Error exporting table '{table_name}': {str(e)}")
            import traceback
            traceback.print_exc()

    print(
        f"\nExport complete! Successfully exported {exported_count} of {len(table_names)} tables to {os.path.abspath(full_output_path)}")
    return full_output_path


def export_to_json(output_dir=None):
    """
    Alternative export format - JSON instead of CSV.
    """
    # Create output directory name if not specified
    if output_dir is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir_name = f"db_export_json_{timestamp}"
    else:
        output_dir_name = output_dir

    # resolve absolute path to backups folder
    full_output_path = get_output_path(output_dir_name)

    # Create directory if it doesn't exist
    if not os.path.exists(full_output_path):
        os.makedirs(full_output_path)

    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    for table_name in table_names:
        try:
            # Execute raw SQL to get all data from the table
            result = db.session.execute(text(f"SELECT * FROM {table_name}"))

            # Get column names
            columns = [col for col in result.keys()]

            # Convert result to list of dictionaries more safely
            rows = []
            for row in result:
                # Convert row object to dictionary using column names as keys
                row_dict = {}
                for i, column in enumerate(columns):
                    row_dict[column] = row[i]
                rows.append(row_dict)

            # Write to JSON file
            file_path = os.path.join(full_output_path, f"{table_name}.json")
            with open(file_path, 'w', encoding='utf-8') as json_file:
                # Handle datetime and other non-serializable types
                json.dump(rows, json_file, default=str, indent=2)

            print(f"Exported table '{table_name}' to JSON: {file_path}")

        except Exception as e:
            print(f"Error exporting table '{table_name}' to JSON: {str(e)}")

    return full_output_path


def list_table_structure():
    """
    Prints the structure (columns and their types) of all tables in the database.
    Useful for understanding the schema before exporting.
    """
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    print("\n=== DATABASE SCHEMA ===")
    for table_name in table_names:
        print(f"\nTable: {table_name}")
        columns = inspector.get_columns(table_name)
        print("Columns:")
        for column in columns:
            print(f"  - {column['name']} ({column['type']})")


def export_to_sql(output_dir=None):
    """
    Export tables as SQL INSERT statements.
    """
    if output_dir is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir_name = f"db_export_sql_{timestamp}"
    else:
        output_dir_name = output_dir

    # resolve absolute path to backups folder
    full_output_path = get_output_path(output_dir_name)

    if not os.path.exists(full_output_path):
        os.makedirs(full_output_path)

    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    for table_name in table_names:
        try:
            # Get columns
            columns = inspector.get_columns(table_name)
            column_names = [column['name'] for column in columns]

            # Get data
            result = db.session.execute(text(f"SELECT * FROM {table_name}"))

            file_path = os.path.join(full_output_path, f"{table_name}.sql")
            with open(file_path, 'w', encoding='utf-8') as sql_file:
                # Write header
                sql_file.write(f"-- Export of {table_name} table\n")
                sql_file.write(f"-- Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

                # Get column data for each row
                rows = []
                for row in result:
                    row_data = []
                    for i, _ in enumerate(column_names):
                        value = row[i]
                        # Format value based on type
                        if value is None:
                            row_data.append("NULL")
                        elif isinstance(value, (int, float)):
                            row_data.append(str(value))
                        elif isinstance(value, (str, datetime)):
                            # Escape quotes in strings
                            str_val = str(value).replace("'", "''")
                            row_data.append(f"'{str_val}'")
                        else:
                            # Default to string representation
                            str_val = str(value).replace("'", "''")
                            row_data.append(f"'{str_val}'")
                    rows.append(row_data)

                # Write insert statements
                if rows:
                    cols_str = ", ".join(column_names)
                    sql_file.write(f"INSERT INTO {table_name} ({cols_str}) VALUES\n")

                    for i, row_data in enumerate(rows):
                        values_str = ", ".join(row_data)
                        if i < len(rows) - 1:
                            sql_file.write(f"  ({values_str}),\n")
                        else:
                            sql_file.write(f"  ({values_str});\n")
                else:
                    sql_file.write(f"-- No data found in table {table_name}\n")

            print(f"Exported table '{table_name}' to SQL: {file_path}")

        except Exception as e:
            print(f"Error exporting table '{table_name}' to SQL: {str(e)}")
            import traceback
            traceback.print_exc()

    return full_output_path


def main():
    # Create and configure the application
    app = create_app(DevelopmentConfig)

    with app.app_context():
        print("Welcome to Database Export Tool")
        print(f"Target Backup Folder: {BACKUPS_FOLDER}")
        print("==============================")

        while True:
            print("\nSelect an option:")
            print("1. Export all tables to CSV files")
            print("2. Export all tables to JSON files")
            print("3. Export all tables to SQL files")
            print("4. Show database schema")
            print("5. Exit")

            choice = input("Enter your choice (1-5): ").strip()

            if choice == '1':
                custom_dir = input("Enter sub-directory name (leave blank for auto-generated timestamp): ").strip()
                output_dir = custom_dir if custom_dir else None
                export_tables_to_csv(output_dir)
            elif choice == '2':
                custom_dir = input("Enter sub-directory name (leave blank for auto-generated timestamp): ").strip()
                output_dir = custom_dir if custom_dir else None
                export_to_json(output_dir)
            elif choice == '3':
                custom_dir = input("Enter sub-directory name (leave blank for auto-generated timestamp): ").strip()
                output_dir = custom_dir if custom_dir else None
                export_to_sql(output_dir)
            elif choice == '4':
                list_table_structure()
            elif choice == '5':
                print("Exiting database export tool.")
                break
            else:
                print("Invalid choice. Please try again.")


if __name__ == "__main__":
    main()