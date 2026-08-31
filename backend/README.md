# Karacter Hub | Deep Call Live — Backend (FastAPI)

Real-time call processing: Twilio Media Streams → speech-to-text → translation → TTS,
with a Socket.io channel that streams text to the Call Studio frontend.

## Layout

```
backend/
├── main.py                     # FastAPI app + /process-audio, /translate, /synthesize
├── config.py                   # env-driven settings
├── ws_hub.py                   # Socket.io server + shared studio settings
├── routes/twilio_routes.py     # /incoming-call webhook, /stream-audio media stream
├── services/stt.py             # Whisper / Google STT
├── services/translation.py     # DeepL / Google Translate
├── services/tts.py             # ElevenLabs / Google TTS
├── services/twilio_stream.py   # mu-law buffering, sound tuning, segment processing
├── requirements.txt
└── Dockerfile
```

## Setup

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env          # fill in your keys
uvicorn main:app --reload --port 8000
```

ffmpeg is required by Whisper (`brew install ffmpeg` / `apt install ffmpeg`).

## Endpoints

| Method | Path              | Purpose                                      |
| ------ | ----------------- | -------------------------------------------- |
| GET    | `/health`         | Liveness probe                                |
| POST   | `/process-audio`  | Multipart audio (WAV/MP3/WEBM) → transcript   |
| POST   | `/translate`      | JSON text → translated text                   |
| POST   | `/synthesize`     | JSON text → MP3 audio                         |
| POST   | `/incoming-call`  | Twilio voice webhook (returns TwiML)          |
| WS     | `/stream-audio`   | Twilio Media Streams socket                   |
| WS     | `/ws/studio`      | Raw websocket for simple clients              |
| WS     | `/socket.io`      | Socket.io channel used by the frontend        |

### Example calls

```bash
curl -F "file=@sample.wav;type=audio/wav" -F "language=en" \
  http://localhost:8000/process-audio

curl -X POST http://localhost:8000/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"Where is my order?","target_lang":"es","source_lang":"en"}'

curl -X POST http://localhost:8000/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"text":"Your package ships today."}' --output reply.mp3
```

## Socket.io events

Server → client: `transcript`, `translation`, `call_status`, `audio_level`
Client → server: `settings`, `start_call`, `end_call`, `audio_chunk`

## Twilio configuration guide

1. Buy a voice-capable number in the Twilio Console.
2. Expose the backend on a public HTTPS URL — locally: `ngrok http 8000` — and set
   `PUBLIC_BASE_URL` to that URL (the `<Stream>` URL is derived from it as `wss://…/stream-audio`).
3. In **Phone Numbers → Active numbers → your number → Voice Configuration**, set
   *A call comes in* to **Webhook**, `https://<your-domain>/incoming-call`, **HTTP POST**.
4. Save `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`.
5. Call the number. `/incoming-call` returns TwiML with `<Connect><Stream>`, Twilio opens the
   media socket, audio is transcribed/translated in ~2s segments and pushed to the studio UI.

Media Streams deliver 8 kHz mu-law audio; `services/twilio_stream.py` converts it to 16-bit
PCM WAV, applies optional sound tuning (DC bias removal + normalization), then calls STT.

## Error handling

- Unsupported content types → `415`; empty upload → `400`; >25 MiB → `413`.
- STT failures return an empty transcript instead of dropping the call.
- Translation failures fall back to the original source text.
- TTS provider failures surface the upstream status and message as a `502`.
