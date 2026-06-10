# Migration Plan: Frontend to S3 and CloudFront

This issue tracks the steps required to permanently migrate the React frontend from the EC2 server to the S3 bucket (`blossom.benmega.com`) served via CloudFront (`d2pa3ix3n5behv.cloudfront.net`), utilizing the new `api-blossom.benmega.com` subdomain for the backend API.

## 1. Backend Configuration Changes

Modify `backend/application/config.py` to allow cross-subdomain sessions and CSRF:
```python
class ProductionConfig(Config):
    # Existing settings...
    SESSION_COOKIE_DOMAIN = ".benmega.com"
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_DOMAIN = ".benmega.com"
    CORS_ORIGINS = ["https://blossom.benmega.com", "https://d2pa3ix3n5behv.cloudfront.net"]
```
*Note: Ensure `backend/application/__init__.py` properly initializes `CSRFProtect(app)` and no hardcoded domains override these config values.*

## 2. CI/CD Pipeline Changes (`deploy.yml`)

We already created `.github/workflows/deploy-frontend.yml` which automatically builds and syncs the frontend to S3 on pushes to `deploy-gunicorn`.

To complete the cutover, you must update the primary `.github/workflows/deploy.yml`:
- Completely **remove** the `Build Frontend` step.
- Completely **remove** the `Copy Files to EC2` step (SCP action).
This ensures the EC2 server no longer attempts to host the static React files.

## 3. Nginx and EC2 Cleanup

- Modify `/home/ubuntu/classroom-chat/deploy.sh` to remove any frontend directory creation, build, or `chown` logic.
- Update the Nginx configuration on EC2:
  - Remove the `/` location block that serves the static React app.
  - Ensure the `api-blossom.benmega.com` server block is routing all API traffic correctly to Gunicorn (`http://127.0.0.1:8000`).

## 4. Route 53 DNS Switch (The Final Cutover)

1. Go to AWS Route 53.
2. Edit the A record for `blossom.benmega.com`.
3. Change it from the EC2 IP to an **Alias** pointing to the CloudFront distribution (`d2pa3ix3n5behv.cloudfront.net`).
4. Wait for DNS propagation.

## Testing Before the Cutover

You can test the S3 fallback by accessing `https://d2pa3ix3n5behv.cloudfront.net` (or forcing an EC2 health check failure so Route 53 routes `blossom.benmega.com` to CloudFront). Ensure the GitHub Action `deploy-frontend.yml` has successfully run at least once so the bucket is populated.
