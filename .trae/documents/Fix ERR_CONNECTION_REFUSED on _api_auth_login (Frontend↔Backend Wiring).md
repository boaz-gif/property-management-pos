## What the Error Actually Means
- `net::ERR_CONNECTION_REFUSED 127.0.0.1:7000/api/auth/login` means **nothing is listening** on `127.0.0.1:7000` at the moment your browser tries to login.
- This is still a connectivity/port binding issue (not Axios), even if the backend “started” earlier—because the backend may have:
  - started on a **different port** (fallback), or
  - exited, or
  - failed to bind 7000 and fell back to another port.

## Core Fix (Make Frontend Independent of Backend Port)
### 1) Use CRA dev proxy + relative API paths
- Update [src/services/api.js](file:///c:/Users/HP/property-management-pos/src/services/api.js) so default `baseURL` becomes `'/api'` (relative), not `http://127.0.0.1:7000/api`.
- This makes the browser call `http://localhost:3000/api/...`, and the dev server proxies it to the backend.

### 2) Configure the proxy target
- Add a `proxy` field in the root [package.json](file:///c:/Users/HP/property-management-pos/package.json) pointing to the backend origin we want in dev:
  - `"proxy": "http://127.0.0.1:7000"`

### 3) Make REACT_APP_API_URL optional in dev
- Update `.env.development` to use `REACT_APP_API_URL=/api` (or remove it entirely), so dev always uses the proxy.

## Fix Related Hardcoded URLs
### 4) Socket.io connection
- Update [SocketContext.js](file:///c:/Users/HP/property-management-pos/src/context/SocketContext.js) so if the API base is relative (`/api`), Socket.io connects to the current origin (port 3000) and relies on proxy.

### 5) Receipt download helper
- Update [PaymentHistory.jsx](file:///c:/Users/HP/property-management-pos/src/pages/tenant/PaymentHistory.jsx) so it derives the backend origin correctly when API base is `/api` (use `window.location.origin`).

## Validation
### 6) Run and verify
- Start backend with a fixed dev port:
  - `cd backend; $env:HOST='127.0.0.1'; $env:PORT='7000'; npm start`
- Start frontend on port 3000:
  - `cd ..; npm start`
- Validate:
  - Browser network shows requests to `http://localhost:3000/api/auth/login` (NOT 127.0.0.1:7000 directly).
  - No more `ERR_CONNECTION_REFUSED`.
  - Backend receives the login request (even if credentials are wrong you’ll get a real 4xx JSON response, not a network error).

I’ll implement these changes and then run both servers to confirm login no longer throws Network Error.