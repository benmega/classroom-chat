# ISS-159: EC2 Server Missing Swap and Proper Node.js Install

## Priority
High

## Summary
The EC2 server currently has no persistent swap file and uses the `apt`-installed version
of Node.js (which pulls in 486MB of unnecessary packages). Without swap, `npm run build`
is OOM-killed. This must be fixed as a one-time server setup step before the automated
deploy pipeline will reliably succeed.

## Root Cause
- EC2 t-series instances have limited RAM (~1GB on t2.micro/t3.micro)
- `npm install` for the React frontend exhausts RAM without swap
- The `apt install npm` installs an old npm version with ~490 unnecessary packages

## Steps to Fix (one-time, on the server)

### 1. Install Node.js LTS via NodeSource (replaces apt npm)
```bash
# Remove the bloated apt npm if installed
sudo apt-get remove --purge nodejs npm -y
sudo apt-get autoremove --purge -y

# Install clean LTS Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

### 2. Create a persistent swap file
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it survive reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
swapon --show
```

## Acceptance Criteria
- [ ] `node -v` returns an LTS version (v20.x or v22.x)
- [ ] `swapon --show` shows an active 1G swapfile
- [ ] `/etc/fstab` has the swapfile entry (persists across reboots)
- [ ] `deploy.sh` preflight check passes without the swap warning
- [ ] `npm run build` in `frontend/` completes without being OOM-killed

## Notes
- `deploy.sh` now warns (but does not abort) if no swap is detected
- An alternative long-term solution is to pre-build `frontend/dist/` in CI
  and upload it via SCP, avoiding the RAM issue entirely (see ISS-160)
