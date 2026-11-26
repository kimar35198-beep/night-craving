# Night Craving

A late-night restaurant ordering site with phone OTP sign-in, a category menu, a cart, and live simulated delivery tracking. React + TypeScript client, Express API, one server for both.

## Live website

**https://night-craving-orcin.vercel.app**

## Run locally

Requirements: Node.js 20+ (tested on Node 24).

```powershell
cd C:\Users\DELL\night-craving
npm install
npm run dev
```

Open **http://localhost:3000**.

No API keys are needed. With no SMS provider configured, the verification code appears on screen as **Preview code** — click **Autofill**, then **Verify & Continue**.

## Production build (local test)

```powershell
npm run build
npm start
```

The client is built into `dist/` and the Express server serves both the site and `/api/*` on port 3000. `npm start` sets `NODE_ENV=production` automatically. Set `PORT` and `SESSION_SECRET` as needed.

## Deploy with Docker

```powershell
docker build -t night-craving .
docker run -p 3000:3000 -e SESSION_SECRET="a-long-random-secret" night-craving
```

The included `render.yaml` also deploys this Docker image to Render with a generated `SESSION_SECRET`. For other hosts (Fly.io, Railway, Cloud Run), use the Dockerfile and set `PORT` if the platform requires a specific port.

## Important before public deployment

This is a **demo**. Without an SMS provider, the server returns the OTP to the browser as `previewOtp`, so anyone can sign in as any phone number. For a real public site, connect an SMS provider and remove `previewOtp` from the `/api/auth/request-otp` response in `server.ts`. Orders are also stored in memory and reset on restart.

## Tech

React 19, TypeScript, Vite 8, Tailwind CSS 4, Express 4, lucide-react.
