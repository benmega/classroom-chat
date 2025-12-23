import os
import pathlib

from openai import OpenAI


def get_directory_summary(root_dir=".", exclude=None):
    """Provides the full file tree so the architect knows where files live."""
    exclude = exclude or {".git", "__pycache__", ".github", "node_modules", "venv"}
    summary = []
    for path in sorted(pathlib.Path(root_dir).rglob("*")):
        if any(part in exclude for part in path.parts): continue
        depth = len(path.parts) - 1
        summary.append(f"{'  ' * depth}- {path.name}{'/' if path.is_dir() else ''}")
    return "\n".join(summary)


def get_file_headers(root_dir=".", limit=50):
    """Reads the first 10 lines of key files to provide code context."""
    context = []
    extensions = {'.js', '.py', '.html', '.css'}
    for path in pathlib.Path(root_dir).rglob("*"):
        if path.suffix in extensions and not any(part.startswith('.') for part in path.parts):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    header = "".join([f.readline() for _ in range(10)])
                    context.append(f"FILE: {path}\nCONTENT SUMMARY:\n{header}\n---")
            except:
                continue
    return "\n".join(context[:limit])


def main():
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Context Gathering
    repo_structure = get_directory_summary()
    file_metadata = get_file_headers()

    issue_title = os.getenv("ISSUE_TITLE", "No Title")
    issue_body = os.getenv("ISSUE_BODY", "No Description")

    system_prompt = """You are a Senior System Architect. Your goal is to triage GitHub issues with surgical precision.

    RULES:
    1. PRIORITIZE CLUES: If an Admin or User mentions a specific file, start your investigation there.
    2. DETECT DYNAMIC UI: If the issue involves elements that appear after a page loads (like chat messages), assume the issue is with JS Event Delegation or re-initialization.
    3. MINIMIZE SCOPE: Do not suggest backend changes unless the frontend logic is proven correct.
    4. CLASSIFY SIZE: Identify if the issue is 'XS' (one line fix), 'S' (one file), 'M' (multiple files), or 'L' (architectural)."""

    user_prompt = f"""
    Analyze the following issue and provide a Targeted Implementation Plan.

    ### ISSUE:
    Title: {issue_title}
    Description: {issue_body}

    ### REPO STRUCTURE:
    {repo_structure}

    ### FILE CONTEXT (First 10 lines):
    {file_metadata}

    ### OUTPUT FORMAT:
    1. **Size Estimate**: [XS/S/M/L] and why.
    2. **Root Cause Analysis**: Hypothesize exactly why it's failing.

    ---PLAN---
    (Provide a numbered list of steps for the coding agent)

    ---FILES TO EXAMINE---
    (List the exact file paths to be modified)
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    print(response.choices[0].message.content)


if __name__ == "__main__":
    main()