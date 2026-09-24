# Conqure Knots UI

A React + Bootstrap console covering the three ways a customer sends SMS through
Conqure Knots (architecture doc):

1. **Send SMS** — the portal itself: single SMS and bulk SMS, calling the SMS API
   Service directly.
2. **API Gateway** — paste an API key, verify it, and send through the gateway path,
   with the equivalent production `curl` (against Azure API Management) shown live.
3. **Applications** — register an application (+ optional webhook URL) and get back
   an API key to use on the API Gateway page or in your own code.

## Run it

This app calls the **live** `ConqureKnots.SmsApi` backend — it needs that running
first (see that project's own README for `dotnet run` / deployment).

```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if your API isn't on localhost:5001
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Before it'll work: enable CORS on the backend

The API only accepts browser calls from origins listed in
`ConqureKnots:Cors:AllowedOrigins` (`appsettings.Development.json` already includes
`http://localhost:5173`). If you run the UI on a different port or host, add that
origin there too, or the browser will block every request with a CORS error.

If the backend is using a self-signed HTTPS dev certificate, your browser may also
block requests until you visit the API's URL directly once and accept the
certificate warning (or run `dotnet dev-certs https --trust`).

## There's no real login yet

Conqure Knots' Identity Service isn't built in this sample (architecture doc §4).
Instead, the top-right "Tenant ID" box lets you type any value to act as that
tenant — every request sends it as the `X-Tenant-Id` header, the same header Azure
API Management resolves and forwards in production (see `apim/policies/global-policy.xml`
in the API project). Use the same Tenant ID consistently to see your own messages
and applications persist across page loads (the backend's in-memory store resets
whenever the API restarts).

## What each page calls

| Page | Endpoint(s) |
| --- | --- |
| Send SMS → Single | `POST /api/v1/sms/send` |
| Send SMS → Bulk | `POST /api/v1/sms/bulk` |
| Send SMS → Recent messages | `GET /api/v1/sms?limit=10` |
| Applications → Create | `POST /api/v1/applications` |
| Applications → List | `GET /api/v1/applications` |
| API Gateway → Verify key | `GET /api/v1/applications/whoami` (demo-only stand-in for APIM's subscription→tenant lookup) |
| API Gateway → Send | `POST /api/v1/sms/send` (using the resolved tenant) |

## Build for deployment 

```bash
npm run build
```

Outputs static files to `dist/` — deploy to Azure Static Web Apps, an App Service
static site, or any static host; point `VITE_API_BASE_URL` (baked in at build time)
at your API Management endpoint once that's deployed, not the App Service directly.
