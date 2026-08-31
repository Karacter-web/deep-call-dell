"""Karacter Hub | Deep Call Live — FastAPI backend."""

from __future__ import annotations

import logging

import socketio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from config import ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES, settings
from routes.twilio_routes import router as twilio_router
from services import stt, translation, tts
from ws_hub import hub, sio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api = FastAPI(title=settings.app_name, version="1.0.0")

api.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api.include_router(twilio_router)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    target_lang: str = Field(default=settings.default_target_lang, max_length=8)
    source_lang: str | None = Field(default=None, max_length=8)


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice_id: str | None = None


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


@api.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
) -> dict[str, str]:
    """Accepts an audio file (WAV/MP3/WEBM) and returns the transcription."""
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(415, f"Unsupported audio type: {file.content_type}")

    audio = await file.read()
    if not audio:
        raise HTTPException(400, "Empty audio upload")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio file too large (25 MiB max)")

    text = await stt.transcribe(audio, language=language)
    if text:
        await hub.broadcast(
            "transcript",
            {"id": file.filename or "upload", "speaker": "caller", "text": text, "at": 0},
        )
    return {"text": text}


@api.post("/translate")
async def translate_text(payload: TranslateRequest) -> dict[str, str]:
    translated = await translation.translate(
        payload.text, target_lang=payload.target_lang, source_lang=payload.source_lang
    )
    return {"text": payload.text, "translated": translated}


@api.post("/synthesize")
async def synthesize(payload: SynthesizeRequest) -> Response:
    try:
        audio = await tts.synthesize(payload.text, voice_id=payload.voice_id)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    return Response(content=audio, media_type="audio/mpeg")


@api.websocket("/ws/studio")
async def studio_socket(websocket: WebSocket) -> None:
    """Raw WebSocket alternative to Socket.io for simple clients."""
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "settings":
                hub.settings.update(message.get("data", {}))
                await websocket.send_json({"type": "settings", "data": hub.settings})
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        logger.info("Studio websocket disconnected")


# Socket.io (frontend real-time channel) wrapped around the FastAPI app.
app = socketio.ASGIApp(sio, other_asgi_app=api)
