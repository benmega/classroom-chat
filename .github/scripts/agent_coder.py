import inspect
import json
import os
import pathlib
import subprocess
import sys
from subprocess import TimeoutExpired

from openai import OpenAI

# Seconds to wait for one model response before the call fails.
MODEL_TIMEOUT = 120
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), timeout=MODEL_TIMEOUT)

MAX_TEST_OUTPUT = 4000
# Seconds a tool may run: the whole backend suite for run_tests, a short command for the rest.
TEST_TIMEOUT = 900
COMMAND_TIMEOUT = 60


# --- TOOLS ---


def list_files():
    """Locate files in the repository."""
    files = []
    for path in pathlib.Path(".").rglob("*"):
        if any(x in path.parts for x in {".git", "venv", "__pycache__", ".github"}):
            continue
        if path.is_file():
            files.append(str(path))
    return "\n".join(files)


def search_code(query):
    """Search for specific strings or patterns using grep."""
    try:
        result = subprocess.run(
            ["grep", "-rnI", query, "."],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
        )
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

        start, end = int(start_line), int(end_line)
        if not 1 <= start <= end <= len(lines):
            return f"Invalid line range {start}-{end}: {path} has {len(lines)} lines."

        # Adjust for 1-based indexing
        lines[start - 1 : end] = [new_content + "\n"]

        with open(path, "w") as f:
            f.writelines(lines)
        return f"Updated {path} from line {start_line} to {end_line}."
    except Exception as e:
        return str(e)


def _tail(output):
    """Last MAX_TEST_OUTPUT characters of captured output (bytes after a timeout, None if empty)."""
    if isinstance(output, bytes):
        output = output.decode(errors="replace")
    return (output or "")[-MAX_TEST_OUTPUT:]


def run_tests():
    """Execute pytest from backend/ (its config and the app live there) and return results."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-q", "-x", "--disable-warnings"],
            cwd="backend",
            env={**os.environ, "FLASK_ENV": "testing"},
            capture_output=True,
            text=True,
            timeout=TEST_TIMEOUT,
        )
    except TimeoutExpired as e:
        # A hanging test must not stall the job: report it so the agent can react.
        return (
            f"Tests timed out after {TEST_TIMEOUT} seconds and were stopped.\n"
            f"STDOUT: {_tail(e.stdout)}\nSTDERR: {_tail(e.stderr)}"
        )
    # Warnings are hidden and only the tail (the failure summary) is kept so a long run cannot
    # flood the model context.
    stdout, stderr = _tail(result.stdout), _tail(result.stderr)
    return f"STDOUT: {stdout}\nSTDERR: {stderr}\nCode: {result.returncode}"


def _login(entry):
    """Author login of a comment or review (the author is null for a deleted account)."""
    return (entry.get("author") or {}).get("login", "ghost")


def get_discussion_context():
    """Fetch full context including comments and reviews from GitHub."""
    obj_num = os.getenv("OBJ_NUMBER")
    is_pr = os.getenv("IS_PR") == "true"
    cmd = "pr" if is_pr else "issue"
    # Only pull requests have reviews: 'gh issue view' rejects the field as unknown.
    fields = "body,comments,reviews" if is_pr else "body,comments"
    try:
        result = subprocess.run(
            ["gh", cmd, "view", obj_num, "--json", fields],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
        )
        if result.returncode != 0:
            return f"Error fetching discussion: {result.stderr.strip()}"
        data = json.loads(result.stdout)
        context = f"Main Description: {data.get('body')}\n\nComments:\n"
        for c in data.get("comments", []):
            context += f"- {_login(c)}: {c['body']}\n"
        if is_pr:
            for r in data.get("reviews", []):
                context += f"- REVIEW ({r['state']}) by {_login(r)}: {r['body']}\n"
        return context
    except Exception as e:
        return f"Error fetching discussion: {e!s}"


TOOL_FUNCTIONS = {
    "list_files": list_files,
    "search_code": search_code,
    "read_file": read_file,
    "patch_file": patch_file,
    "run_tests": run_tests,
    "get_discussion_context": get_discussion_context,
}


def run_tool(name, raw_arguments):
    """Run one tool call from the model and return its result as text.

    A call the model got wrong (unknown tool, malformed or missing arguments) or a tool that
    raises is reported back to the model as the tool result instead of ending the whole run.
    """
    function = TOOL_FUNCTIONS.get(name)
    if function is None:
        return f"Unknown tool: {name}. Available tools: {', '.join(TOOL_FUNCTIONS)}."
    try:
        args = json.loads(raw_arguments or "{}")
    except json.JSONDecodeError as e:
        return f"Invalid arguments for {name}: not valid JSON ({e})."
    if not isinstance(args, dict):
        return f"Invalid arguments for {name}: expected a JSON object."
    try:
        inspect.signature(function).bind(**args)
    except TypeError as e:
        return f"Invalid arguments for {name}: {e}."
    try:
        return str(function(**args))
    except Exception as e:
        return f"Tool {name} failed: {e!s}"


# --- MAIN LOOP ---


def main():
    obj_type = "Pull Request" if os.getenv("IS_PR") == "true" else "Issue"
    plan_context = os.getenv("ISSUE_PLAN") or "No plan provided."
    description = os.getenv("ISSUE_BODY") or "No description provided."

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
            4) Run tests to verify the fix.""",
        },
        {
            "role": "user",
            "content": f"Title: {os.getenv('ISSUE_TITLE')}\nDescription: {description}\nArchitect Plan: {plan_context}\n\nImplement the fix.",
        },
    ]

    tools = [
        {
            "type": "function",
            "function": {"name": "list_files", "description": "List all repo files"},
        },
        {
            "type": "function",
            "function": {
                "name": "search_code",
                "parameters": {
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                },
                "description": "Grep search",
            },
        },
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "parameters": {
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                },
                "description": "Read with line numbers",
            },
        },
        {
            "type": "function",
            "function": {
                "name": "patch_file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "start_line": {"type": "integer"},
                        "end_line": {"type": "integer"},
                        "new_content": {"type": "string"},
                    },
                },
                "description": "Replace lines",
            },
        },
        {
            "type": "function",
            "function": {"name": "run_tests", "description": "Run pytest"},
        },
        {
            "type": "function",
            "function": {
                "name": "get_discussion_context",
                "description": "Get latest GH comments/reviews",
            },
        },
    ]

    for _ in range(12):
        response = client.chat.completions.create(
            model="gpt-4o", messages=messages, tools=tools
        )
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            break

        for tool_call in msg.tool_calls:
            result = run_tool(tool_call.function.name, tool_call.function.arguments)
            messages.append(
                {"role": "tool", "tool_call_id": tool_call.id, "content": result}
            )


if __name__ == "__main__":
    main()
