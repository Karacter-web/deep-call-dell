"""Text-to-speech service (ElevenLabs by default, Google TTS optional)."""

from __future__ import annotations

import base64
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


async def synthesize(text: str, voice_id: str | None = None) -> bytes:
    """Return MP3 bytes for the given text. Raises on unrecoverable failure."""
    if not text.strip():
        raise ValueError("text must not be empty")

    if settings.tts_provider == "google":
        return await _synthesize_google(text)
    return await _synthesize_elevenlabs(text, voice_id or settings.elevenlabs_voice_id)


async def _synthesize_elevenlabs(text: str, voice_id: str) -> bytes:
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured")

    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        "?output_format=mp3_44100_128"
    )
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "use_speaker_boost": True,
                },
            },
        )
    if response.status_code >= 400:
        logger.error("ElevenLabs TTS failed [%s]: %s", response.status_code, response.text)
        raise RuntimeError(f"TTS failed [{response.status_code}]: {response.text}")
    return response.content


async def _synthesize_google(text: str) -> bytes:
    if not settings.google_translate_api_key:
        raise RuntimeError("GOOGLE_TRANSLATE_API_KEY is not configured")

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            params={"key": settings.google_translate_api_key},
            json={
                "input": {"text": text},
                "voice": {"languageCode": "en-US"},
                "audioConfig": {"audioEncoding": "MP3"},
            },
        )
    if response.status_code >= 400:
        raise RuntimeError(f"TTS failed [{response.status_code}]: {response.text}")
    return base64.b64decode(response.json()["audioContent"])
