# ISS-158: GitHub Secrets Incomplete for Automated Deploy

## Priority
High

## Summary
The GitHub Actions `deploy.yml` now correctly injects a full `.env` file onto the server
from GitHub Secrets. However, the required secrets must be manually added to the repository
before the pipeline will work end-to-end.

## Required GitHub Secrets

Navigate to: **GitHub → Repository → Settings → Secrets and variables → Actions**

| Secret Name | Description | How to generate |
|---|---|---|
| `EC2_HOST` | Server hostname, e.g. `blossom.benmega.com` | AWS Console |
| `EC2_USERNAME` | SSH user, typically `ubuntu` | — |
| `EC2_SSH_KEY` | Full contents of `~/.ssh/test-key.pem` | `cat ~/.ssh/test-key.pem` |
| `SECRET_KEY` | Flask session signing key | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Secondary confirmation password for the `/admin/verify_password` endpoint (a safety gate on destructive admin actions). **Not** the database admin user password — that lives in the DB. Without this, `config.py` raises `RuntimeError` and gunicorn won't start in production. | Choose any strong password |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI dashboard |
| `WEBHOOK_SECRET` | Shared secret used by `api_webhooks.py` to authenticate incoming transcription callbacks from the AWS Lambda transcriber. | Match the value in your Lambda env |

## Acceptance Criteria
- [ ] All secrets listed above are present in GitHub Actions settings
- [ ] A push to `deploy-gunicorn` triggers a successful pipeline run
- [ ] The server's `backend/.env` is overwritten with correct values on each deploy
- [ ] No secrets are ever committed to the repository

## Notes
- `DATABASE_URL` is hardcoded in `deploy.yml` (not a secret) since the path is deterministic
- The `.env` file is in `.gitignore` and should never be committed
