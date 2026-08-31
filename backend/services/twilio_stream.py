"""Twilio Media Streams handling: mu-law chunks -> WAV -> STT -> translation."""

from __future__ import annotations

import audioop
import base64
import io
import logging
import wave
from dataclasses import dataclass, field

from services import stt, translation

logger = logging.getLogger(__name__)

TWILIO_SAMPLE_RATE = 8000
# Emit a transcription roughly every 2 seconds of audio (8000 samples/s mu-law).
CHUNK_SAMPLES = TWILIO_SAMPLE_RATE * 2


@dataclass
class StreamSession:
    """Buffers Twilio mu-law audio and turns it into transcript segments."""

    call_sid: str
    source_lang: str = "en"
    target_lang: str = "es"
    translation_enabled: bool = True
    sound_tuning_enabled: bool = True
    _buffer: bytearray = field(default_factory=bytearray)

    def add_payload(self, payload_b64: str) -> None:
        self._buffer.extend(base64.b64decode(payload_b64))

    @property
    def ready(self) -> bool:
        return len(self._buffer) >= CHUNK_SAMPLES

    def take_wav(self) -> bytes:
        """Drain the buffer and return it as a 16-bit PCM WAV file."""
        mulaw = bytes(self._buffer)
        self._buffer.clear()
        pcm = audioop.ulaw2lin(mulaw, 2)
        if self.sound_tuning_enabled:
            pcm = _tune(pcm)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(TWILIO_SAMPLE_RATE)
            wav.writeframes(pcm)
        return buffer.getvalue()

    async def process(self) -> dict[str, str]:
        """Transcribe (and optionally translate) the buffered audio."""
        wav_bytes = self.take_wav()
        text = await stt.transcribe(wav_bytes, language=self.source_lang)
        result = {"text": text, "translated": ""}
        if text and self.translation_enabled:
            result["translated"] = await translation.translate(
                text, target_lang=self.target_lang, source_lang=self.source_lang
            )
        return result


def _tune(pcm: bytes) -> bytes:
    """Light sound tuning: DC bias removal + normalization toward a target level."""
    try:
        bias_free = audioop.bias(pcm, 2, 0)
        peak = audioop.max(bias_free, 2) or 1
        factor = min(4.0, 20000 / peak)
        return audioop.mul(bias_free, 2, factor)
    except Exception:  # noqa: BLE001
        logger.exception("Sound tuning failed; using raw PCM")
        return pcm
