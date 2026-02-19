## What the Error Means
- `Error: listen EACCES: permission denied 0.0.0.0:5002` means Windows is **blocking your Node process from binding** to port `5002` on all interfaces.
- This is usually caused by:
  - A **reserved/excluded port range** (common with Hyper-V / WSL / Docker / VPN software), which yields EACCES even if the port isn’t “in use”.
  - Less commonly: corporate endpoint protection policy or a service-level restriction.

## Immediate Workaround (No Code Changes)
- Run the backend on a different port:
  - PowerShell:
    - `setx PORT 5010` (new terminal required after)
    - or ` $env:PORT=5010; npm start `
- Pick a port like `5010`, `5050`, or `7000`.
- If you want to confirm this is an excluded range issue:
  - `netsh interface ipv4 show excludedportrange protocol=tcp`
  - Choose a port outside the excluded ranges.

## Code Changes I Will Implement (So It Never Crashes Like This Again)
### 1) Add HOST/PORT support + safer defaults
- Update [server.js](file:///c:/Users/HP/property-management-pos/backend/server.js#L195-L202) to:
  - Read `HOST` (default `127.0.0.1`) and `PORT` (default `5002`).
  - Bind explicitly to `HOST` instead of `0.0.0.0` by default (reduces Windows policy conflicts).

### 2) Add a server error handler
- Attach a `server.on('error', ...)` handler that:
  - Detects `EACCES` / `EADDRINUSE`.
  - Prints a clear message and suggests setting `PORT`.
  - Optionally auto-fallback to the next port (e.g., try `PORT+1` up to `PORT+20`) so devs can boot even when a port is blocked.

### 3) Remove duplicate SIGTERM handler
- `server.js` currently registers SIGTERM twice (one inside the `require.main` block and one global). I’ll keep a single handler.

### 4) Verify
- Start server with a chosen port and confirm it binds cleanly.
- Run backend tests to ensure no regressions.

If you approve this plan, I’ll apply the code fixes so `npm start` works reliably on Windows even when a specific port is blocked.