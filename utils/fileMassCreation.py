import os
import shutil

def create_prefixed_folder(src_dir, prefix="test_"):
    """
    Creates a new folder with files from the source folder,
    prefixed with the specified string.

    Parameters:
        src_dir (str): Path to the source directory.
        prefix (str): Prefix to add to each file name (default: "test_").

    Returns:
        str: Path to the new folder containing the prefixed files.
    """
    if not os.path.isdir(src_dir):
        raise ValueError(f"The source path '{src_dir}' is not a valid directory.")

    # Create a new directory for the prefixed files
    parent_dir = os.path.dirname(src_dir)
    dest_dir = os.path.join(parent_dir, f"{prefix.rstrip('_')}_folder")
    os.makedirs(dest_dir, exist_ok=True)

    for file_name in os.listdir(src_dir):
        src_file = os.path.join(src_dir, file_name)

        # Ensure only files are copied
        if os.path.isfile(src_file):
            dest_file = os.path.join(dest_dir, f"{prefix}{file_name}")
            shutil.copy(src_file, dest_file)

    return dest_dir

# Example usage:
src_directory = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\application\\routes"
new_directory = create_prefixed_folder(src_directory)
print(f"Prefixed files are stored in: {new_directory}")
