import os

def find_db():
    base_dir = os.path.abspath(".")
    instance_dir = os.path.join(base_dir, "instance")
    print(f"Checking instance dir: {instance_dir}")
    if os.path.exists(instance_dir):
        files = os.listdir(instance_dir)
        print(f"Files in instance: {files}")
        for f in files:
            if f.endswith(".db"):
                path = os.path.join(instance_dir, f)
                print(f"Database: {path}, Size: {os.path.getsize(path)}")
    else:
        print("Instance dir NOT FOUND at root.")

    # Check backend/instance
    backend_instance = os.path.join(base_dir, "backend", "instance")
    print(f"Checking backend instance dir: {backend_instance}")
    if os.path.exists(backend_instance):
        files = os.listdir(backend_instance)
        print(f"Files in backend/instance: {files}")
        for f in files:
            if f.endswith(".db"):
                path = os.path.join(backend_instance, f)
                print(f"Database: {path}, Size: {os.path.getsize(path)}")

find_db()
