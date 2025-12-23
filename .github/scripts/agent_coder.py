import json
import os
import pathlib
import subprocess

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# --- TOOLS ---

def list_files():
    """Locate files in the repository."""
    files = []
    for path in pathlib.Path(".").rglob('*'):
        if any(x in path.parts for x in {'.git', 'venv', '__pycache__', '.github'}): continue
        if path.is_file(): files.append(str(path))
    return "\n".join(files)


def search_code(query):
    """Search for specific strings or patterns using grep."""
    try:
        result = subprocess.run(["grep", "-rnI", query, "."], capture_output=True, text=True)
        return result.stdout[:2000]
    except Exception as e:
        return str(e)


def read_file(path):
    """Read file with line numbers for precise patching."""
    try:
        with open(path, "r") as f:
            lines = f.readlines()
            return "".join([f"{i + 1}: {line}" for i, line in enumerate(lines)])
    except Exception as e:
        return str(e)


def patch_file(path, start_line, end_line, new_content):
    """Replace a specific range of lines. Prevents accidental code deletion."""
    try:
        with open(path, "r") as f:
            lines = f.readlines()

        # Adjust for 1-based indexing
        lines[int(start_line) - 1: int(end_line)] = [new_content + "\n"]

        with open(path, "w") as f:
            f.writelines(lines)
        return f"Updated {path} from line {start_line} to {end_line}."
    except Exception as e:
        return str(e)


def run_tests():
    """Execute pytest and return results."""
    result = subprocess.run(["pytest"], capture_output=True, text=True)
    return f"STDOUT: {result.stdout}\nSTDERR: {result.stderr}\nCode: {result.returncode}"


def get_discussion_context():
    """Fetch full context including comments and reviews from GitHub."""
    obj_num = os.getenv("OBJ_NUMBER")
    is_pr = os.getenv("IS_PR") == "true"
    cmd = "pr" if is_pr else "issue"
    try:
        result = subprocess.run(
            ["gh", cmd, "view", obj_num, "--json", "body,comments,reviews"],
            capture_output=True, text=True
        )
        data = json.loads(result.stdout)
        context = f"Main Description: {data.get('body')}\n\nComments:\n"
        for c in data.get("comments", []):
            context += f"- {c['author']['login']}: {c['body']}\n"
        if is_pr:
            for r in data.get("reviews", []):
                context += f"- REVIEW ({r['state']}) by {r['author']['login']}: {r['body']}\n"
        return context
    except Exception as e:
        return f"Error fetching discussion: {str(e)}"


# --- MAIN LOOP ---

def main():
    obj_type = "Pull Request" if os.getenv("IS_PR") == "true" else "Issue"
    plan_context = os.getenv("ISSUE_PLAN", "No plan provided.")

    messages = [
        {
            "role": "system",
            "content": f"""You are an autonomous staff engineer fixing a {obj_type}.

            STRICT HIERARCHY OF TRUTH:
            1. Call 'get_discussion_context' first.
            2. Follow any "Targeted Plan" in comments exactly.
            3. Human comments override the original Issue/PR body.

            REQUIRED WORKFLOW:
            1) Search/List files to locate the problem.
            2) Read files with line numbers.
            3) Patch only the necessary lines (do not overwrite whole files).
            4) Run tests to verify the fix."""
        },
        {"role": "user",
         "content": f"Title: {os.getenv('ISSUE_TITLE')}\nArchitect Plan: {plan_context}\n\nImplement the fix."}
    ]

    tools = [
        {"type": "function", "function": {"name": "list_files", "description": "List all repo files"}},
        {"type": "function", "function": {"name": "search_code",
                                          "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
                                          "description": "Grep search"}},
        {"type": "function",
         "function": {"name": "read_file", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}},
                      "description": "Read with line numbers"}},
        {"type": "function", "function": {"name": "patch_file", "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "start_line": {"type": "integer"}, "end_line": {"type": "integer"},
            "new_content": {"type": "string"}}}, "description": "Replace lines"}},
        {"type": "function", "function": {"name": "run_tests", "description": "Run pytest"}},
        {"type": "function",
         "function": {"name": "get_discussion_context", "description": "Get latest GH comments/reviews"}}
    ]

    for _ in range(12):
        response = client.chat.completions.create(model="gpt-4o", messages=messages, tools=tools)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls: break

        for tool_call in msg.tool_calls:
            name, args = tool_call.function.name, json.loads(tool_call.function.arguments)
            if name == "list_files":
                result = list_files()
            elif name == "search_code":
                result = search_code(args["query"])
            elif name == "read_file":
                result = read_file(args["path"])
            elif name == "patch_file":
                result = patch_file(args["path"], args["start_line"], args["end_line"], args["new_content"])
            elif name == "run_tests":
                result = run_tests()
            elif name == "get_discussion_context":
                result = get_discussion_context()

            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})


if __name__ == "__main__":
    main()