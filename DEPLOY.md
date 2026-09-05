# Deployment

## Frontend (Vercel)

The frontend is a TanStack Start (React + Vite + Nitro) app — not Next.js — so Vercel
must build it with the Nitro Vercel preset. `vercel.json` already does this:

```json
{
  "buildCommand": "NITRO_PRESET=vercel npm run build",
  "outputDirectory": ".vercel/output"
}
```

Steps:

1. Import the repository in Vercel (Framework preset: **Other**).
2. Add the environment variables from `.env` / `.env.example`:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY`, `TWILIO_API_KEY`, `TWILIO_WEBHOOK_TOKEN`
   - `PUBLIC_BASE_URL` — the deployed https origin (e.g. `https://your-app.vercel.app`)
   - optional: `VITE_BACKEND_WS_URL`
3. Deploy. The Twilio webhooks are then served at:
   - `POST https://<domain>/api/public/twilio/voice?t=$TWILIO_WEBHOOK_TOKEN`
   - `POST https://<domain>/api/public/twilio/transcription?t=$TWILIO_WEBHOOK_TOKEN`
   - `POST https://<domain>/api/public/twilio/status?t=$TWILIO_WEBHOOK_TOKEN`

Numbers purchased through the app are configured with `PUBLIC_BASE_URL` (falling back to
the Lovable published URL), so set it before buying numbers on Vercel.

## Backend (FastAPI)

`backend/vercel.json` + `backend/api/index.py` deploy the FastAPI app to Vercel's Python
runtime (set the Vercel project **Root Directory** to `backend`). Environment variables
come from `.env.example` (`DEEPL_API_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_*`,
`PUBLIC_BASE_URL`, `FRONTEND_ORIGIN`).

Limitation: Vercel serverless functions do not support long-lived WebSockets, so the
Twilio Media Streams endpoint (`/stream-audio`) and the Socket.io stream will not work
there. For those, deploy `backend/Dockerfile` to a container host (Fly.io, Render,
Railway, Cloud Run) and point `VITE_BACKEND_WS_URL` and `PUBLIC_BASE_URL` at it.

The live transcription path used by Call Studio runs on the frontend's own public
webhook routes and needs no Python service.
