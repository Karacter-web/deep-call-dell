# Karacter Hub | Deep Call Live

Real-time call studio: inbound Twilio calls are transcribed, translated and streamed
live into a split-screen operator UI.

- **Frontend** — React + TanStack Start (Vite), Tailwind CSS, Socket.io client. Route: `/call-studio` (`/` redirects there).
- **Backend** — FastAPI + Socket.io (`backend/`), Whisper STT, DeepL translation, ElevenLabs TTS, Twilio Media Streams.

## Frontend setup

```bash
npm install
cp .env.example .env      # optional: set VITE_BACKEND_WS_URL
npm run dev               # http://localhost:8080
```

If `VITE_BACKEND_WS_URL` is unset, the studio runs a built-in **mock stream** so the UI is
fully usable before the Python service is running. Set it to the FastAPI origin
(`http://localhost:8000`) to consume real Socket.io events.

### Structure

```
src/
├── routes/call-studio.tsx           # main studio page
├── context/CallStudioContext.tsx    # call/translation/language state (React Context)
├── lib/studio-stream.ts             # Socket.io client + mock fallback
└── components/call/
    ├── AudioInput.tsx               # mic monitoring + level meter + call status
    ├── IncomingTextFrame.tsx        # raw STT output
    ├── TranslatedTextFrame.tsx      # translated output
    └── CallControls.tsx             # start/end, translation, sound tuning, languages
```

## Backend setup

See [`backend/README.md`](backend/README.md) for endpoints, example API calls and the
full Twilio configuration guide.

## Docker

```bash
cp .env.example .env      # fill in API keys
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8000 (docs at `/docs`)

Both images use multi-stage builds. For Twilio, point `PUBLIC_BASE_URL` at a public HTTPS
tunnel (e.g. `ngrok http 8000`) and set the number's voice webhook to `POST /incoming-call`.
