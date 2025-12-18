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
    return f"Successfully updated {path}. ALWAYS run tests next to verify."


def run_tests():
    """Runs pytest and returns results. Used for self-correction."""
    result = subprocess.run(["pytest"], capture_output=True, text=True)
    output = result.stdout + result.stderr
    status = "PASSED" if result.returncode == 0 else "FAILED"
    return f"Test Status: {status}\nOutput:\n{output}"


# --- THE SELF-CORRECTING LOOP ---
def main():
    issue_context = f"Title: {os.getenv('ISSUE_TITLE')}\nBody: {os.getenv('ISSUE_BODY')}"
    messages = [
        {
            "role": "system",
            "content": """You are an autonomous staff engineer. 
            Your workflow: 
            1. list_files to see structure. 
            2. read_file to understand context. 
            3. write_file to implement a VERBOSE, documented solution. 
            4. run_tests to verify. 
            If tests FAIL, you must read the error and use write_file again to fix it. 
            Do not stop until tests PASS or you've tried 3 times to fix them."""
        },
        {"role": "user", "content": f"Solve this issue:\n{issue_context}"}
    ]

    tools = [
        {"type": "function", "function": {"name": "list_files", "description": "List all repo files"}},
        {"type": "function",
         "function": {"name": "read_file", "parameters": {"type": "object", "properties": {"path": {"type": "string"}}},
                      "description": "Read a file"}},
        {"type": "function", "function": {"name": "write_file", "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "content": {"type": "string"}}}, "description": "Write a file"}},
        {"type": "function", "function": {"name": "run_tests", "description": "Run the project test suite"}}
    ]

    for i in range(12):  # Increased turns to allow for fixing mistakes
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

            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})

    # ... after the loop ...
    # Write a summary of the agent's actions to a log file
    log_content = "\n".join([str(m) for m in messages if m.get("role") != "system"])
    with open("ai_agent_log.md", "w") as f:
        f.write("# Agent Activity Log\n\n" + log_content)
    print("Wrote activity log to ai_agent_log.md")

if __name__ == "__main__":
    main()