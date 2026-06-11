import subprocess
import json
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("tool", help="Tool name")
    parser.add_argument("args", help="JSON arguments")
    args = parser.parse_args()

    tool_name = args.tool
    tool_args = json.loads(args.args)

    proc = subprocess.Popen(
        ['node', r'C:\Users\Ben\AppData\Local\Programs\Antigravity\resources\app.asar.unpacked\node_modules\chrome-devtools-mcp\build\src\bin\chrome-devtools-mcp.js'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True
    )

    init_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "mcp_client", "version": "1.0"}
        }
    }
    proc.stdin.write(json.dumps(init_req) + '\n')
    proc.stdin.flush()

    for line in proc.stdout:
        resp = json.loads(line)
        if resp.get("id") == 1:
            break

    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + '\n')
    proc.stdin.flush()

    call_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": tool_args
        }
    }
    proc.stdin.write(json.dumps(call_req) + '\n')
    proc.stdin.flush()

    for line in proc.stdout:
        resp = json.loads(line)
        if resp.get("id") == 2:
            print(json.dumps(resp, indent=2))
            break

    proc.terminate()

if __name__ == "__main__":
    main()
