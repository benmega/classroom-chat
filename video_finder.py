# video_scanner.py
# Type: Script
# Location: Local machine
# Summary: Recursively scans a user selected folder for video files and exports results to CSV.

import csv
import os
from tkinter import Tk, filedialog

VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".wmv",
    ".mkv",
    ".avi",
    ".flv",
    ".mpeg",
    ".mpg",
    ".webm",
}


def is_video_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in VIDEO_EXTENSIONS


def choose_folder():
    root = Tk()
    root.withdraw()
    return filedialog.askdirectory(title="Select folder to scan")


def scan_folder(folder):
    for root, dirs, files in os.walk(folder):
        for f in files:
            if is_video_file(f):
                full_path = os.path.join(root, f)
                yield {
                    "full_path": full_path,
                    "file_name": f,
                }


def write_csv(output_file, rows):
    with open(output_file, "w", newline="", encoding="utf8") as csvfile:
        writer = csv.DictWriter(
            csvfile, fieldnames=["full_path", "file_name", "extra_field"]
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    folder = choose_folder()
    if not folder:
        print("No folder selected.")
        return

    results = list(scan_folder(folder))
    output_path = "video_scan_results.csv"
    write_csv(output_path, results)
    print(f"Done. Saved to {output_path}")


if __name__ == "__main__":
    main()
