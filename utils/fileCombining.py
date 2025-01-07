import os

# Define the directory containing the Python files
directory = "C:\\Users\\Ben\\PycharmProjects\\groupChat2\\application\\models"
output_file = "combined_file.py"

# Collect all Python files in the directory
python_files = [f for f in os.listdir(directory) if f.endswith('.py')]

with open(output_file, 'w') as outfile:
    for file in python_files:
        file_path = os.path.join(directory, file)
        with open(file_path, 'r') as infile:
            outfile.write(f"# Start of {file}\n")
            outfile.write(infile.read())
            outfile.write(f"\n# End of {file}\n\n")

print(f"Combined {len(python_files)} files into {output_file}")
