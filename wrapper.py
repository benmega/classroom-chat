"""
File: wrapper.py
Type: py
Summary: Helper wrapper for running the application in different contexts.
"""

import sys
import traceback

from main import main as run_app


def main():
    try:
        return run_app()
    except Exception as e:
        print("ERROR: An exception occurred:")
        print(traceback.format_exc())
        input("Press Enter to exit...")
        return 1


if __name__ == "__main__":
    sys.exit(main())
