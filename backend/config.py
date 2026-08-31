"""Central configuration for Karacter Hub | Deep Call Live."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Karacter Hub | Deep Call Live"
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS / frontend
    frontend_origin: str = "http://localhost:3000"
    public_base_url: str = "http://localhost:8000"  # public https URL used by Twilio

    # Speech to text
    stt_provider: Literal["whisper", "google"] = "whisper"
    whisper_model: str = "base"
    google_stt_credentials: str | None = None

    # Translation
    translation_provider: Literal["deepl", "google"] = "deepl"
    deepl_api_key: str | None = None
    google_translate_api_key: str | None = None
    default_target_lang: str = "es"

    # Text to speech
    tts_provider: Literal["elevenlabs", "google"] = "elevenlabs"
    elevenlabs_api_key: str | None = None
    elevenlabs_voice_id: str = "JBFqnCBsd6RMkjVDRZzb"  # George

    # Twilio
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_phone_number: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

ALLOWED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/mpeg",
    "audio/mp3",
    "audio/webm",
    "audio/mp4",
}
MAX_AUDIO_BYTES = 25 * 1024 * 1024
