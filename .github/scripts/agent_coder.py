import json
import os
import pathlib

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# --- TOOL DEFINITIONS ---
def list_files():
    """Returns a tree of the repo to help the AI navigate."""
    files = []
    for path in pathlib.Path(".").rglob('*'):
        if any(x in path.parts for x in {'.git', 'venv', '__pycache__', '.github'}): continue
        files.append(str(path))
    return "\n".join(files)


def read_file(path):
    """Allows the AI to see the content of a specific file."""
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return str(e)


def write_file(path, content):
    """Allows the AI to save its changes to the disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f: f.write(content)
    return f"Successfully updated {path}"


# --- EXECUTION LOOP ---
def main():
    issue_context = f"Title: {os.getenv('ISSUE_TITLE')}\nBody: {os.getenv('ISSUE_BODY')}"
    messages = [
        {"role": "system",
         "content": "You are a senior dev. 1. List files. 2. Read relevant files. 3. Write fixes. Do not stop until the task is complete."},
        {"role": "user", "content": f"Fix this issue:\n{issue_context}"}
    ]

    tools = [
        {"type": "function", "function": {"name": "list_files", "description": "List all repository files"}},
        {"type": "function",
         "function": {"name": "read_file", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}},
                      "description": "Read a file"}},
        {"type": "function", "function": {"name": "write_file", "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "content": {"type": "string"}}}, "description": "Write a file"}}
    ]

    for _ in range(8):  # Maximum 8 turns to prevent runaway costs
        response = client.chat.completions.create(model="gpt-4o", messages=messages, tools=tools)
        msg = response.choices[0].message
        messages.append(msg)

        if not msg.tool_calls: break

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)

            if name == "list_files":
                result = list_files()
            elif name == "read_file":
                result = read_file(args['path'])
            elif name == "write_file":
                result = write_file(args['path'], args['content'])

            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})


if __name__ == "__main__":
    main()