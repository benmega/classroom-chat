import os
import pathlib

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def get_file_headers(root_dir=".", limit=15):
    """Reads the first few lines of JS and Python files to understand their purpose."""
    context = []
    extensions = {'.js', '.py', '.html'}

    for path in pathlib.Path(root_dir).rglob("*"):
        if path.suffix in extensions and not any(part.startswith('.') for part in path.parts):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    # Get first 10 lines (usually contains your file summaries)
                    header = "".join([f.readline() for _ in range(10)])
                    context.append(f"FILE: {path}\nCONTENT SUMMARY:\n{header}\n---")
            except:
                continue
    return "\n".join(context[:50])  # Limit to stay within context window


def main():
    api_key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)

    issue_title = os.getenv("ISSUE_TITLE", "Profile link broken in chat")
    issue_body = os.getenv("ISSUE_BODY",
                           "User icon clickable link to profile is broken. Admin says check messagehandling.js")

    # NEW: Get actual file metadata
    file_metadata = get_file_headers()
    repo_structure = ""  # Keep your existing directory summary here

    system_prompt = """You are a Senior System Architect. Your goal is to triage GitHub issues with surgical precision.

    RULES:
    1. PRIORITIZE CLUES: If an Admin or User mentions a specific file, start your investigation there.
    2. DETECT DYNAMIC UI: If the issue involves elements that appear after a page loads (like chat messages), assume the issue is with JS Event Delegation or re-initialization.
    3. MINIMIZE SCOPE: Do not suggest backend changes unless the frontend logic is proven correct.
    4. CLASSIFY SIZE: Identify if the issue is 'XS' (one line fix), 'S' (one file), 'M' (multiple files), or 'L' (architectural)."""

    user_prompt = f"""
    Analyze the issue and provide:
    1. **Size Estimate**: [XS/S/M/L] and why.
    2. **Root Cause Analysis**: Hypothesize exactly why it's failing based on the file headers.
    3. **Targeted Plan**: Step-by-step for the coding agent.
    4. **Files to Modify**: Exact list of files.

    ### ISSUE:
    Title: {issue_title}
    Description: {issue_body}

    ### FILE CONTEXT (First 10 lines of key files):
    {file_metadata}
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