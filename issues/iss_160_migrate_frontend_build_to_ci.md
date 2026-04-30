# ISS-160: Move Frontend Build to CI (GitHub Actions)

## Priority
Medium

## Summary
Currently `deploy.sh` runs `npm run build` on the EC2 server during deployment. This is
fragile — it depends on swap space, Node.js being installed, and sufficient disk. A more
robust approach is to build `frontend/dist/` in GitHub Actions and upload the artifact
to the server, removing all Node.js dependency from the EC2 instance entirely.

## Proposed Architecture

```
GitHub Actions (ubuntu-latest, plenty of RAM)
  ├── checkout code
  ├── npm install && npm run build  ← runs here, not on EC2
  ├── upload dist/ as artifact
  └── SSH to EC2:
        ├── git reset --hard
        ├── scp dist/ from CI runner → server   (or download artifact)
        ├── pip install -r requirements.txt
        ├── run migrations
        └── systemctl restart gunicorn
```

## Benefits
- Eliminates OOM risk on EC2 (Node.js never runs on the server)
- Faster deploys (no npm install on slow EC2)
- Cleaner EC2 environment (only Python/gunicorn/nginx needed)
- Build failures caught in CI before touching production

## Implementation Notes
- Use `appleboy/scp-action` or `rsync` over SSH to upload `dist/`
- Remove the frontend build section from `deploy.sh` once CI handles it
- The `deploy.sh` preflight swap check becomes unnecessary
- EC2 no longer needs Node.js installed at all

## Acceptance Criteria
- [ ] GitHub Actions workflow builds frontend and uploads `dist/` to server
- [ ] `deploy.sh` no longer runs `npm install` / `npm run build`
- [ ] Deploy completes successfully without swap or Node.js on EC2
- [ ] Rollback still works correctly if health check fails

## Related
- ISS-159 (swap/Node.js setup) is the short-term workaround; this is the long-term fix
