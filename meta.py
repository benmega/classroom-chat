import os

def create_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Directory created: {path}")
    else:
        print(f"Directory already exists: {path}")

def create_file(path):
    with open(path, 'w') as file:
        pass
    print(f"File created: {path}")

import os

def print_directory_structure(startpath, exclude=[]):
    for root, dirs, files in os.walk(startpath):
        # Filtering out excluded directories from the dirs list
        dirs[:] = [d for d in dirs if d not in exclude]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")

def main():
    project_directory = os.getcwd()
    print_directory_structure(project_directory, ['venv', '.git', '.idea'])

if __name__ == "__main__":
    main()


'''
gC:\Users\Ben\PycharmProjects\RepositoryGenerator\venv\Scripts\python.exe C:\Users\Ben\PycharmProjects\groupChat2\meta.py 
groupChat2/
    ${DATABASE_PATH}
    alembic.ini
    config.env
    main.py
    main.spec
    meta.py
    my_flask_app.spec
    alembic/
        env.py
        README
        script.py.mako
        versions/
            28176d396310_add_message_sending_enabled_column.py
            30978dd57814_add_banned_words_table.py
            69050f7b3da8_initial_migration.py
            __pycache__/
                28176d396310_add_message_sending_enabled_column.cpython-310.pyc
                30978dd57814_add_banned_words_table.cpython-310.pyc
                69050f7b3da8_initial_migration.cpython-310.pyc
        __pycache__/
            env.cpython-310.pyc
    application/
        config.py
        extensions.py
        socket_events.py
        __init__.py
        ai/
            ai_teacher.py
            __init__.py
            __pycache__/
                ai_teacher.cpython-310.pyc
                __init__.cpython-310.pyc
        api/
            authentication.py
            endpoints.py
            __init__.py
        models/
            banned_words.py
            configuration.py
            conversation.py
            message.py
            user.py
            __init__.py
            __pycache__/
                banned_words.cpython-310.pyc
                configuration.cpython-310.pyc
                conversation.cpython-310.pyc
                user.cpython-310.pyc
                __init__.cpython-310.pyc
        utilities/
            helper_functions.py
            __init__.py
            __pycache__/
                helper_functions.cpython-310.pyc
                __init__.cpython-310.pyc
        routes/
            admin_routes.py
            ai_routes.py
            general_routes.py
            user_routes.py
            __init__.py
            __pycache__/
                admin_routes.cpython-310.pyc
                ai_routes.cpython-310.pyc
                general_routes.cpython-310.pyc
                user_routes.cpython-310.pyc
                __init__.cpython-310.pyc
        __pycache__/
            config.cpython-310.pyc
            extensions.cpython-310.pyc
            socket_events.cpython-310.pyc
            __init__.cpython-310.pyc
    build/
        main/
            Analysis-00.toc
            base_library.zip
            EXE-00.toc
            main.pkg
            PKG-00.toc
            PYZ-00.pyz
            PYZ-00.toc
            warn-main.txt
            xref-main.html
            localpycs/
                pyimod01_archive.pyc
                pyimod02_importers.pyc
                pyimod03_ctypes.pyc
                pyimod04_pywin32.pyc
                struct.pyc
        my_flask_app/
            Analysis-00.toc
            base_library.zip
            EXE-00.toc
            my_flask_app.pkg
            PKG-00.toc
            PYZ-00.pyz
            PYZ-00.toc
            warn-my_flask_app.txt
            xref-my_flask_app.html
            localpycs/
                pyimod01_archive.pyc
                pyimod02_importers.pyc
                pyimod03_ctypes.pyc
                pyimod04_pywin32.pyc
                struct.pyc
    dist/
        main.exe
        my_flask_app.exe
    instance/
        users.db
        utilities/
            add_column.py
            clean_slate.py
            inspectdb.py
            recreate.py
    static/
        css/
            main.css
        images/
            logo.ico
        js/
            config.js
            main.js
            admin/
                admin.js
            messages/
                messageHandling.js
            sockets/
                socketLogic.js
                socketManager.js
            users/
                usernameLogic.js
            utils/
    templates/
        dashboard.html
        index.html
    tests/
    __pycache__/

Process finished with exit code 0

'''

