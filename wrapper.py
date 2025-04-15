
import sys
import traceback
from main import main as run_app


def main():
    try:
        # Import and run your actual application
        return run_app()
    except Exception as e:
        print("ERROR: An exception occurred:")
        print(traceback.format_exc())
        input("Press Enter to exit...")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
