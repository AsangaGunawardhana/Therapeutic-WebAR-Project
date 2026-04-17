# Therapeutic WebAR Project

A real-time WebAR therapeutic research prototype that adapts visual and guidance output using heart-rate biofeedback.

This project combines:
- Google sign-in for session access
- Mobile AR interaction in the browser
- A Node.js + Socket.IO backend
- An evidence-based decision engine (`ebdEngine.js`)
- Live wearable input support (HypeRate and `/hr` endpoint)

## Live Demo

- App: https://therapeutic-webar-project-production-b068.up.railway.app/
- Environment: Production (Railway)
- Notes: Requires Google sign-in and camera permission (HTTPS is already enabled).

## Current Flow

1. User opens `/` and is redirected to `login.html`.
2. User signs in with Google.
3. User configures palette, focal mode, and watch ID in `index.html`.
4. `ar.html` claims the watch session and receives adaptive `ar:command` messages in real time.

## Key Features

- Real-time HR/HRV-driven state adaptation
- Session-aware socket routing (per connected client)
- Watch pairing via `claim_device`
- HypeRate WebSocket bridge + HTTP heart-rate ingestion
- Therapeutic modes (full AR and comfort/simple variants)
- Session summary modal and downloadable patient-facing report

## Tech Stack

- Node.js (>= 18)
- Express
- Socket.IO
- ws (HypeRate bridge)
- HTML/CSS/JavaScript frontend
- Three.js-based AR rendering (in `frontend/ar.html`)

## Project Structure

```text
Therapeutic-WebAR-Project/
|-- backend/
|   |-- ebdEngine.js
|   |-- server.js
|   `-- package.json
|-- frontend/
|   |-- login.html
|   |-- index.html
|   |-- ar.html
|   |-- dashboard.html
|   `-- main.js
|-- docs/
|   `-- qa/
|-- README.md
`-- package.json
```

## Prerequisites

- Node.js 18 or newer
- npm
- A modern mobile browser for AR testing
- Camera permissions enabled on the test device
- Same network for local testing (or HTTPS tunnel for phone access)

## Quick Start

### 1) Install dependencies

From repo root:

```bash
npm install
```

Backend dependencies are also defined in `backend/package.json`. If needed:

```bash
cd backend
npm install
```

### 2) Run the server

From repo root:

```bash
npm start
```

Or in development mode:

```bash
npm run dev
```

Default server port is `3001` (see `backend/server.js`).

### 3) Open the app

On the same machine:

```text
http://localhost:3001
```

This opens `login.html` first.

## Mobile Camera Access

Most mobile browsers require `https://` (or `localhost`) for camera APIs.

If testing from a phone on the same LAN and camera does not start over plain HTTP, use an HTTPS tunnel such as ngrok:

```bash
ngrok http 3001
```

Open the HTTPS ngrok URL on the phone.

## Device and Biometrics Input

### Option A: HypeRate session pairing (recommended)

- Enter watch ID in `index.html` (example: `5038D`)
- `ar.html` emits `claim_device`
- Backend routes live HR updates to the paired socket session

### Option B: Direct HTTP heart-rate ingestion

The backend accepts heart-rate values at:

```text
POST /hr
GET  /hr?hr=85&deviceId=YOUR_DEVICE
```

Accepted keys:
- `hr` or `heartrate`
- optional `deviceId`

## Socket Events

Client to server:
- `claim_device` (device/session code)
- `bio:update` (manual/simulated HR, HRV, palette, context)

Server to client:
- `ar:command` (state, vitals, visual prescription, patient/clinical messages)

## HTTP Endpoints

- `GET /` -> redirect to `/login.html`
- `POST /connect-watch` -> switch active HypeRate session
- `ALL /hr` -> ingest HR from external device integrations
- Static frontend files served from `/frontend`

## Configuration Points

Update these values in `backend/server.js` as needed:
- `PORT` (default `3001`)
- `DEBOUNCE_MS` and `HOLD_MS` (state smoothing behavior)
- `HYPERATE_SESSION` (default watch session)
- `HYPERATE_TOKEN` (current HypeRate token)

Update Google sign-in client ID in `frontend/login.html`:
- `CLIENT_ID`

## Testing and Utility Pages

- `frontend/dashboard.html`: biometric simulator that emits `bio:update`
- `docs/qa/`: QA evidence and task reports

## Troubleshooting

### App not reachable on mobile
- Confirm server is running on port `3001`
- Confirm phone and server are on same network
- Check firewall rules
- Use HTTPS tunnel for camera-required pages

### Camera not starting
- Grant camera permission in browser settings
- Use HTTPS URL on mobile (or localhost)
- Close other apps that may hold camera lock

### No live AR updates
- Verify Socket.IO connection is established
- Confirm watch ID is entered in setup screen
- Confirm device pairing reached backend (`claim_device`)
- Confirm HR source is publishing (`/hr` or HypeRate stream)

## Security and Privacy Notes

- This is a research prototype, not a production medical platform.
- Session data is stored in browser storage for flow continuity.
- Google ID token checks are implemented in the frontend flow.
- For production, move OAuth token verification and secrets management fully server-side.
- Do not expose hard-coded tokens/client IDs in public deployments.

## License

Final Year Project (FYP) research implementation.

---

Last updated: April 17, 2026
