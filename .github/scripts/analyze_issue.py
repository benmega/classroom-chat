import os
import pathlib

from dotenv import load_dotenv
from openai import OpenAI

# Load .env file for local development
load_dotenv()


def get_directory_summary(root_dir=".", exclude=None):
    if exclude is None:
        exclude = {".git", "__pycache__", ".github", "node_modules", "venv", ".env"}

    summary = []
    for path in sorted(pathlib.Path(root_dir).rglob("*")):
        # Skip excluded directories and files within them
        if any(part in exclude for part in path.parts):
            continue

        depth = len(path.parts) - 1
        indent = "  " * depth
        summary.append(f"{indent}- {path.name}{'/' if path.is_dir() else ''}")
    return "\n".join(summary)


def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not found.")
        return

    client = OpenAI(api_key=api_key)

    issue_title = os.getenv("ISSUE_TITLE", "Test Issue")
    issue_body = os.getenv("ISSUE_BODY", "Test Description")
    repo_structure = get_directory_summary()

    prompt = f"""
    Analyze this GitHub issue and provide:
    1. **Plan of Action**: Step-by-step implementation.
    2. **Required Context**: Specific files or documentation needed.

    ### ISSUE TITLE:
    {issue_title}

    ### ISSUE DESCRIPTION:
    {issue_body}

    ### REPOSITORY STRUCTURE:
    {repo_structure}
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a senior developer helping organize tasks.",
            },
            {"role": "user", "content": prompt},
        ],
    )

    print(response.choices[0].message.content)


if __name__ == "__main__":
    main()
