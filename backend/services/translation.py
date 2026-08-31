"""Translation service (DeepL by default, Google Translate optional)."""

from __future__ import annotations

import asyncio
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


async def translate(text: str, target_lang: str, source_lang: str | None = None) -> str:
    """Translate text. Falls back to the original text if translation fails."""
    if not text.strip():
        return ""
    try:
        if settings.translation_provider == "google":
            return await _translate_google(text, target_lang, source_lang)
        return await _translate_deepl(text, target_lang, source_lang)
    except Exception:  # noqa: BLE001 - graceful degradation
        logger.exception("Translation failed; returning source text")
        return text


async def _translate_deepl(text: str, target_lang: str, source_lang: str | None) -> str:
    if not settings.deepl_api_key:
        raise RuntimeError("DEEPL_API_KEY is not configured")

    import deepl

    def _run() -> str:
        translator = deepl.Translator(settings.deepl_api_key)
        result = translator.translate_text(
            text,
            target_lang=target_lang.upper(),
            source_lang=source_lang.upper() if source_lang else None,
        )
        return result.text  # type: ignore[union-attr]

    return await asyncio.to_thread(_run)


async def _translate_google(text: str, target_lang: str, source_lang: str | None) -> str:
    if not settings.google_translate_api_key:
        raise RuntimeError("GOOGLE_TRANSLATE_API_KEY is not configured")

    params = {
        "q": text,
        "target": target_lang,
        "key": settings.google_translate_api_key,
    }
    if source_lang:
        params["source"] = source_lang

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://translation.googleapis.com/language/translate/v2", params=params
        )
        response.raise_for_status()
        payload = response.json()
    return payload["data"]["translations"][0]["translatedText"]
