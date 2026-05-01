# ISS-011: `session_routes.py` Makes Blocking HTTP Request at Module Load Time

**Type:** Reliability / Performance  
**Severity:** Medium  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

`session_routes.py` makes a **synchronous, blocking HTTP request** to the AWS EC2 Instance Metadata Service at **import time** (lines 22–37). On a non-EC2 machine (local dev, CI, Docker without IMDSv2), this request will block the entire application startup for 1 second (the hardcoded timeout) before failing.

Additionally, a `boto3.client("cloudwatch")` instance is created at module scope, which can also fail or delay startup.

---

## Affected File

`backend/application/routes/session_routes.py`, lines 21–39:
```python
try:
    response = requests.get(
        "http://169.254.169.254/latest/dynamic/instance-identity/document", timeout=1.0
    )
    ...
except requests.exceptions.ConnectionError:
    print("Not on EC2. Using default dev values.")
```

---

## Impact

- **1-second startup delay** on every non-EC2 machine (every developer's machine).
- If the route is imported before the app is fully configured, exceptions during module import can prevent the app from booting entirely.
- The CloudWatch metric namespace is hardcoded to `"YourAppName/Activity"` — a placeholder that was never filled in, meaning production CloudWatch metrics are being published under an incorrect namespace.

---

## Recommended Fix

Move the EC2 metadata fetch and CloudWatch client initialization into a lazy function, called only when the heartbeat route is actually invoked:
```python
@session.route("/heartbeat", methods=["POST"])
def heartbeat():
    instance_id, region = _get_ec2_metadata()  # Lazy, cached
    cw = boto3.client("cloudwatch", region_name=region)
    ...
```

Also fix the CloudWatch namespace from `"YourAppName/Activity"` to the actual application name (e.g., `"ClassroomChat/Activity"`).
