# Migration Plan: Frontend to S3 and CloudFront

This issue tracks the steps required to permanently migrate the React frontend from the EC2 server to the S3 bucket (`blossom.benmega.com`) served via CloudFront (`d2pa3ix3n5behv.cloudfront.net`), utilizing the new `api-blossom.benmega.com` subdomain for the backend API.

## 1. Backend Configuration Changes

Modify `backend/application/config.py` to allow cross-subdomain sessions:
```python
class ProductionConfig(Config):
    # Existing settings...
    SESSION_COOKIE_DOMAIN = ".benmega.com"
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = True
    CORS_ORIGINS = ["https://blossom.benmega.com"]
```

Modify `backend/application/__init__.py` to share the CSRF cookie across subdomains:
```python
# Change the CSRF protection initialization to use the cookie domain
csrf = CSRFProtect()
def create_app(config_class=ProductionConfig):
    # ...
    csrf.init_app(app)
    app.config['WTF_CSRF_SSL_STRICT'] = False # If needed depending on architecture
```
*Note: Wait, Flask-WTF CSRF handles cookie domains. Better to check `WTF_CSRF_TIME_LIMIT` and `SESSION_COOKIE_DOMAIN` integrations.*

## 2. CI/CD Pipeline Changes (`deploy.yml`)

Update `.github/workflows/deploy.yml` to build the frontend targeting the new API and push to S3:
```yaml
      - name: Build Frontend
        env:
          VITE_API_URL: https://api-blossom.benmega.com
        run: |
          cd frontend
          npm install
          npm run build

      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: 'blossom.benmega.com'
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'ap-southeast-1'
          SOURCE_DIR: 'frontend/dist'

      - name: Invalidate CloudFront
        uses: chetan/invalidate-cloudfront-action@v2
        env:
          DISTRIBUTION: E3VTOHKU7GPN72
          PATHS: "/*"
          AWS_REGION: "ap-southeast-1"
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```
*Remove the SCP step (`Copy Files to EC2`) from `deploy.yml` once S3 is the primary host.*

## 3. Nginx and EC2 Cleanup

- Modify `/home/ubuntu/classroom-chat/deploy.sh` to remove frontend build/directory chown logic if any.
- Update the Nginx configuration on EC2:
  - Remove the `/` location block that serves the static React app.
  - Ensure the `api-blossom.benmega.com` server block is routing correctly to Gunicorn (`http://127.0.0.1:8000`).

## 4. Route 53 DNS Switch (The Final Cutover)

1. Go to AWS Route 53.
2. Edit the A record for `blossom.benmega.com`.
3. Change it from the EC2 IP to an **Alias** pointing to the CloudFront distribution (`d2pa3ix3n5behv.cloudfront.net`).
4. Wait for DNS propagation.

## Testing Before the Cutover

You can test the S3 fallback by accessing `https://d2pa3ix3n5behv.cloudfront.net` (or forcing an EC2 health check failure so Route 53 routes `blossom.benmega.com` to CloudFront). Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are added to GitHub Secrets to allow the fallback pipeline to deploy.
