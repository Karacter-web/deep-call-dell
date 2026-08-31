"""Speech-to-text service (Whisper by default, Google STT optional)."""

from __future__ import annotations

import asyncio
import logging
import tempfile
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

_whisper_model = None


def _load_whisper():
    global _whisper_model
    if _whisper_model is None:
        import whisper  # imported lazily: heavy dependency

        logger.info("Loading whisper model '%s'", settings.whisper_model)
        _whisper_model = whisper.load_model(settings.whisper_model)
    return _whisper_model


async def transcribe(audio_bytes: bytes, language: str | None = None) -> str:
    """Transcribe raw audio bytes into text. Returns '' on failure."""
    if not audio_bytes:
        return ""
    try:
        if settings.stt_provider == "google":
            return await _transcribe_google(audio_bytes, language)
        return await asyncio.to_thread(_transcribe_whisper, audio_bytes, language)
    except Exception:  # noqa: BLE001 - never break the call on STT failure
        logger.exception("STT failed")
        return ""


def _transcribe_whisper(audio_bytes: bytes, language: str | None) -> str:
    model = _load_whisper()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        path = Path(tmp.name)
    try:
        result = model.transcribe(str(path), language=language, fp16=False)
        return str(result.get("text", "")).strip()
    finally:
        path.unlink(missing_ok=True)


async def _transcribe_google(audio_bytes: bytes, language: str | None) -> str:
    from google.cloud import speech  # type: ignore[import-not-found]

    client = speech.SpeechClient()
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        language_code=language or "en-US",
        enable_automatic_punctuation=True,
    )
    audio = speech.RecognitionAudio(content=audio_bytes)
    response = await asyncio.to_thread(client.recognize, config=config, audio=audio)
    return " ".join(r.alternatives[0].transcript for r in response.results).strip()
