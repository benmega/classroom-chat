import json
import os
import pathlib
import subprocess

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# --- TOOLS ---
def list_files():
    files = []
    for path in pathlib.Path(".").rglob('*'):
        if any(x in path.parts for x in {'.git', 'venv', '__pycache__', '.github'}): continue
        files.append(str(path))
    return "\n".join(files)


def read_file(path):
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception as e:
        return str(e)


def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f: f.write(content)
    return f"Successfully updated {path}."


def run_tests():
    result = subprocess.run(["pytest"], capture_output=True, text=True)
    return f"Test Status: {'PASSED' if result.returncode == 0 else 'FAILED'}\nOutput:\n{result.stdout + result.stderr}"


def get_discussion_context():
    """Fetches all comments and the body of the issue or PR for full context."""
    obj_number = os.getenv("OBJ_NUMBER")
    is_pr = os.getenv("IS_PR") == "true"
    cmd_type = "pr" if is_pr else "issue"

    try:
        # Fetch body and all comments/reviews
        result = subprocess.run(
            ["gh", cmd_type, "view", obj_number, "--json", "body,comments,reviews"],
            capture_output=True, text=True
        )
        data = json.loads(result.stdout)

        context = f"Main Description: {data.get('body')}\n\nComments:\n"
        for comment in data.get("comments", []):
            context += f"- {comment['author']['login']}: {comment['body']}\n"

        if is_pr:
            for review in data.get("reviews", []):
                context += f"- REVIEW ({review['state']}) by {review['author']['login']}: {review['body']}\n"

        return context
    except Exception as e:
        return f"Error fetching discussion: {str(e)}"


# --- MAIN LOOP ---
def main():
    obj_type = "Pull Request" if os.getenv("IS_PR") == "true" else "Issue"
    messages = [
        {
            "role": "system",
            "content": f"""You are an autonomous staff engineer. 
            You are currently working on a {obj_type}.
            1. Use 'get_discussion_context' FIRST to see the latest feedback and requirements.
            2. Use 'list_files' and 'read_file' to understand the code.
            3. Use 'write_file' to implement/fix the solution.
            4. Use 'run_tests' to verify.
            If this is a PR, you are iterating on your previous work. Do not start over; fix what was requested."""
        },
        {"role": "user",
         "content": f"Title: {os.getenv('ISSUE_TITLE')}\nPlease solve the request described in this {obj_type}."}
    ]

    tools = [
        {"type": "function", "function": {"name": "list_files", "description": "List all repo files"}},
        {"type": "function",
         "function": {"name": "read_file", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}},
                      "description": "Read a file"}},
        {"type": "function", "function": {"name": "write_file", "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "content": {"type": "string"}}}, "description": "Write a file"}},
        {"type": "function", "function": {"name": "run_tests", "description": "Run the project test suite"}},
        {"type": "function",
         "function": {"name": "get_discussion_context", "description": "Get all comments and review feedback"}}
    ]

    for _ in range(12):
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
            elif name == "run_tests":
                result = run_tests()
            elif name == "get_discussion_context":
                result = get_discussion_context()

            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})

    # Log generation
    log_content = ""
    for m in messages:
        m_dict = m if isinstance(m, dict) else m.model_dump()
        if m_dict.get("role") != "system":
            log_content += f"### {m_dict.get('role').upper()}\n{m_dict.get('content') or 'Tool Action'}\n\n"
    with open("ai_agent_log.md", "w") as f:
        f.write("# Agent Activity Log\n\n" + log_content)


if __name__ == "__main__":
    main()