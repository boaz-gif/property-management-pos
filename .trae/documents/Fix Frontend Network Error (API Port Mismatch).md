## Diagnosis (Why You See “Network Error”)
- Your browser log shows the frontend calling `http://localhost:5002/api/auth/login` and getting `ERR_CONNECTION_REFUSED`.
- That means the backend is **not listening on 5002**, so the request never reaches Express (this is not an Axios bug).
- In your environment, Windows blocks binding to 5002 (EACCES), so the backend falls back to a different port (we previously saw it successfully bind to **5500**).

## What We’ll Change (So Login Works)
### 1) Make frontend API base URL configurable and correct
- Update [src/services/api.js](file:///c:/Users/HP/property-management-pos/src/services/api.js) so it no longer hardcodes `http://localhost:5002/api` as the default.
- Preferred behavior:
  - If `REACT_APP_API_URL` is set → use it.
  - Otherwise default to `http://127.0.0.1:5500/api` (matching your backend fallback).
- Update the refresh-token URL in the same file to use the same base (it currently also assumes `5002`).

### 2) Add a frontend `.env.development`
- Add `/.env.development` in the frontend root:
  - `REACT_APP_API_URL=http://127.0.0.1:5500/api`
- This makes the fix explicit and easy to change later if you pick a different backend port.

### 3) Fix any other hardcoded backend URLs
- Update tenant receipt download helper in [PaymentHistory.jsx](file:///c:/Users/HP/property-management-pos/src/pages/tenant/PaymentHistory.jsx) which currently falls back to `http://localhost:5002`.

## Return Frontend to Port 3000
- Stop the current frontend instance and restart normally:
  - `npm start`
- If 3000 is busy, we’ll free it or keep 3001, but either way the API calls will work once base URL is correct.

## Validation
- Start backend (verify it prints its final port; expected 5500).
- Start frontend on 3000.
- Log in and confirm:
  - No `ERR_CONNECTION_REFUSED` in browser console.
  - `/api/auth/login` returns a real response.

If you approve, I’ll apply these small config/code changes and then run both servers to confirm login succeeds.