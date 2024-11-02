import os

def check_directory_exists(path):
    return os.path.isdir(path)


def get_txt_files(directory):
    txt_files = []  # List to store all .txt file paths
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.txt'):  # Check if the file is a .txt file
                full_path = os.path.join(root, file)  # Get the full path of the file
                txt_files.append(full_path)  # Add to the list
    return txt_files


def get_all_folders(directory):
    folder_list = []  # List to store all folder paths
    for root, dirs, files in os.walk(directory):
        for dir_name in dirs:
            full_path = os.path.join(root, dir_name)  # Get the full path of the directory
            folder_list.append(full_path)  # Add to the list
        break  # Stop after the first level to get only top-level folders
    return folder_list


def NoteTaker1():
    def read_notes(subject, assignment_name):  # Changed from addinput to assignment_name
        with open(f"{subject}Notes/{assignment_name}.txt", "r") as file:
            # Loop through each line in the file and print it
            for line in file:
                print(line.strip())  # strip() removes extra newline or whitespace




    subject = input('Choose your subject [SocialStudies, English, Science, Mandarin, Thai, IT]: ')
    assignmentlist = get_txt_files(f"{subject}Notes")
    assignment_name = input('Choose your assignment' + str(assignmentlist)  )
    desiredinput = ["SocialStudies", "English", "Science", "Mandarin", "Thai", "IT"]
    if subject not in desiredinput:
        print("That is not an option")
        return
    read_notes(subject, assignment_name)


#Choose your assignment(remember to add unit and chapter like U1C3 after the subject

def FolderMaker():
    folderstring = input("Please provide a list of folders(comma's seperate the folders)")
    folderarray = folderstring.split(",")





    for folder in folderarray:
        if not check_directory_exists(folder):
            os.mkdir(folder)


input2 = input('Choose your tool [NoteTaker, FolderMaker]')
if input2 == "NoteTaker":
    NoteTaker1()
elif input2 == "FolderMaker":
    FolderMaker()
else:
    print("Thats not a tool!")

