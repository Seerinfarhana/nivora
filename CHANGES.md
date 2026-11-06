# NIVORA update

Copy these files over your project (same folders). Do NOT replace your `.env` files or `nivora.db`.

1. `cd backend` then `python -m pip install -r requirements.txt` (adds user-agents and httpx)
2. Restart the backend. It upgrades your existing `nivora.db` by itself; existing accounts keep their data.
3. `cd frontend` then `npm run dev`
4. Everyone is signed out once (sessions are now tracked per device). Sign in again.

## What changed
- New customers start empty (no fake balance or spending). They answer onboarding questions first.
- Settings works: name, mobile, preferences, text size, daily transfer limit, PIN, password, real signed-in devices.
- Forgot password: /forgot and /reset. With no SMTP set in `.env`, the reset link prints in the backend console.
- Knowledge centre shows live RBI feeds. Recommendations shows loans from `backend/app/data/loans.json`.
- Language options removed. The app is English only.

## Loans
`loans.json` is empty on purpose. Copy real products from each bank's official page (see `loans.example.json`),
including `source_url` and `last_checked`. Do not type in rates you have not seen on the bank's page.
