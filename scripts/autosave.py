import os
import subprocess
import time


def autosave():
    print("Autosave daemon started...")
    while True:
        time.sleep(600)  # 10 minutes
        try:
            status = subprocess.check_output("git status --porcelain", shell=True, text=True)
            if status.strip():
                print("Changes detected, committing to autosave branch...")
                current_branch = subprocess.check_output("git branch --show-current", shell=True, text=True).strip()

                # We do not want to commit directly to the current branch to avoid cluttering history.
                # Instead, we create a parallel autosave branch.
                autosave_branch = f"autosave/{current_branch}"

                # Stash changes
                subprocess.run("git stash push -m \"autosave_tmp\"", shell=True)

                # Checkout autosave branch
                subprocess.run(f"git checkout -B {autosave_branch}", shell=True)

                # Apply stash, commit, and go back
                subprocess.run("git stash apply", shell=True)
                subprocess.run("git add -A", shell=True)
                subprocess.run(f"git commit -m \"Autosave {time.time()}\"", shell=True)
                subprocess.run(f"git checkout {current_branch}", shell=True)
                subprocess.run("git stash pop", shell=True)

                print(f"Saved to {autosave_branch}")
        except Exception as e:
            print(f"Autosave error: {e}")

if __name__ == "__main__":
    autosave()
