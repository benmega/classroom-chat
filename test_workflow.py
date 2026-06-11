import subprocess
import json
import time

proc = subprocess.Popen(
    ['node', r'C:\Users\Ben\AppData\Local\Programs\Antigravity\resources\app.asar.unpacked\node_modules\chrome-devtools-mcp\build\src\bin\chrome-devtools-mcp.js'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

def send_req(req_id, method, params=None):
    req = {"jsonrpc": "2.0", "id": req_id, "method": method}
    if params is not None:
        req["params"] = params
    proc.stdin.write(json.dumps(req) + '\n')
    proc.stdin.flush()
    while True:
        line = proc.stdout.readline()
        if not line: break
        resp = json.loads(line)
        if resp.get("id") == req_id:
            return resp

send_req(1, "initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "mcp_client", "version": "1.0"}
})
proc.stdin.write(json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + '\n')
proc.stdin.flush()

res = send_req(2, "tools/call", {
    "name": "navigate_page",
    "arguments": {"type": "url", "url": "http://localhost:5173/dev-login?role=admin"}
})

time.sleep(3)

res = send_req(3, "tools/call", {
    "name": "take_snapshot",
    "arguments": {}
})
print(res["result"]["content"][0]["text"])

proc.terminate()
