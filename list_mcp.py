import subprocess
import json

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
        "clientInfo": {"name": "test", "version": "1.0"}
    }
}
proc.stdin.write(json.dumps(init_req) + '\n')
proc.stdin.flush()

for line in proc.stdout:
    resp = json.loads(line)
    if resp.get("id") == 1:
        break

tools_req = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
}
proc.stdin.write(json.dumps(tools_req) + '\n')
proc.stdin.flush()

for line in proc.stdout:
    resp = json.loads(line)
    if resp.get("id") == 2:
        print(json.dumps(resp, indent=2))
        break

proc.terminate()
