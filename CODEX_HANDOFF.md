# GHOST CONTROL Codex Handoff

Use this file to continue the project from another Codex session, especially the VPS/root Codex CLI session.

## Repository

- GitHub: `https://github.com/SYGANG420/ghost-app`
- Production branch: `main`
- Current production VPS path: `/opt/ghost-app/ghost-app`
- Production domain: `https://ghost-control.duckdns.org`
- VPS IP: `89.127.235.242`

## Production Runtime

- Backend: FastAPI, uvicorn, systemd service `ghost-control`
- Frontend: React + Vite, built to `frontend/dist`, served by Nginx
- Database: SQLCipher at `/opt/ghost-app/ghost-app/data/ghost.db`
- Secrets: `/opt/ghost-app/ghost-app/.env`
- Nginx site: `/etc/nginx/sites-available/ghost-control`
- Client cert CA/material: `/opt/ghost-certs`

## Current Security State

- HTTPS is enabled for `ghost-control.duckdns.org`.
- Nginx client certificate auth is enabled:
  - `ssl_client_certificate /opt/ghost-certs/ca.crt;`
  - `ssl_verify_client on;`
  - `ssl_verify_depth 2;`
- `device_a.p12` and `device_b.p12` are the installed phone client certificates.
- SSH password login is temporarily enabled for development:
  - `PermitRootLogin yes`
  - `PasswordAuthentication yes`
  - `PubkeyAuthentication yes`
- Re-harden SSH later:
  - `PermitRootLogin prohibit-password`
  - `PasswordAuthentication no`

## VPS Codex

Codex CLI was installed on the VPS and helper commands were created:

- `ghost-codex`
- `ghost-codex-exec`
- `ghost-codex-login-device`
- `ghost-codex-login-key`
- `ghost-codex-doctor`
- `ghost-codex-status`
- `ghost-codex-start`
- `ghost-codex-attach`
- `ghost-codex-stop`

Persistent tmux/systemd session:

- tmux session: `ghost-codex`
- systemd service: `ghost-codex-tmux.service`

Typical iPhone/VPS flow:

```bash
ssh root@89.127.235.242
ghost-codex-attach
```

## Recent Production Fixes

Latest production commits on `main`:

- `4a04e7b Recover API requests after stale JWT`
  - Frontend retries once after 401 by refreshing JWT from `/api/auth/device`.
  - Backend WebSocket broadcast no longer crashes API flow when a stale socket is present.
- `40280dc Load map markers from location API`
  - MAP now loads A/B saved locations from `/api/location` on open and every 30s.
  - This fixed the case where A/B existed in DB but markers did not appear.

## Known Behavior

- PWA cannot keep GPS running after the app is fully closed.
- Current PWA behavior:
  - Foreground/open app: GPS and heartbeat can run.
  - Closed/background: browser may stop WebSocket/GPS/heartbeat.
- For real always-on GPS, Android APK with Foreground Service is the chosen path.

## Android APK Work In Progress

This branch contains WIP for proper APK direct-install operation:

- Capacitor config: `frontend/capacitor.config.json`
- Android project: `frontend/android`
- Native bridge: `frontend/src/native/ghostLocation.js`
- React hook: `frontend/src/hooks/useNativeLocationService.js`
- CTRL panel: `frontend/src/components/NativeLocationPanel.jsx`
- Guide: `frontend/ANDROID_APK.md`

Design:

- React UI runs in Capacitor WebView.
- GPS background sending runs in Android Foreground Service.
- The service sends `POST /api/heartbeat` every 30 seconds.
- Client certificates are not embedded in the APK.
- Android KeyChain selects the installed `device_a.p12` or `device_b.p12`.
- WebView client cert requests also use the saved KeyChain alias.

This Android work is not yet build-verified. Next steps:

```bash
cd frontend
npm install
npm run mobile:sync
npm run mobile:open
```

Or build APK in an environment with Android Studio/Gradle:

```bash
cd frontend
npm run mobile:apk
```

## Test History

Earlier full tests passed:

- Backend pytest: `38 passed`
- Frontend Vitest: `14 passed`
- Playwright E2E: `1 passed`

After recent changes, rerun before merging Android work:

```bash
cd /opt/ghost-app/ghost-app
source venv/bin/activate
pytest backend/tests/ -v --tb=short

cd frontend
npm test
```

## Deployment

Production deployment:

```bash
cd /opt/ghost-app/ghost-app
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
systemctl restart ghost-control
systemctl reload nginx
```

Or:

```bash
cd /opt/ghost-app/ghost-app
bash deploy.sh
```

## Important Notes

- Do not commit `.p12`, private keys, `.env`, or `.local-ssh`.
- A Termius private key was pasted in chat once. Treat that Termius key as compromised and regenerate it before use.
- API calls require both:
  - valid client certificate at TLS layer
  - valid JWT at app layer
- If frontend gets 401, current client code should refresh JWT once and retry.

## Suggested Prompt For VPS Codex

Paste this into the VPS/root Codex session:

```text
You are continuing GHOST CONTROL from CODEX_HANDOFF.md. First read CODEX_HANDOFF.md, git status, recent commits, and frontend/ANDROID_APK.md. Continue from branch codex/android-apk-wip. The priority is build-verifying the Capacitor Android APK with native Foreground Service GPS heartbeat and mTLS via Android KeyChain. Do not commit secrets or p12 files.
```
