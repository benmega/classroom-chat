
import sys
import traceback

def main():
    try:
        # Import and run your actual application
        import main
        main.app.run()
    except Exception as e:
        print("ERROR: An exception occurred:")
        print(traceback.format_exc())
        input("Press Enter to exit...")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
