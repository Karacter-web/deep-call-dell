"""In-memory Socket.io hub shared between Twilio streams and the frontend."""

from __future__ import annotations

import logging
from typing import Any

import socketio

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


class Hub:
    """Tracks studio settings and fans events out to connected frontends."""

    def __init__(self) -> None:
        self.settings: dict[str, Any] = {
            "translationEnabled": True,
            "soundTuningEnabled": True,
            "sourceLang": "en",
            "targetLang": "es",
        }

    async def broadcast(self, event: str, payload: dict[str, Any]) -> None:
        await sio.emit(event, payload)


hub = Hub()


@sio.event
async def connect(sid: str, environ: dict[str, Any]) -> None:  # noqa: ARG001
    logger.info("Frontend connected: %s", sid)
    await sio.emit("call_status", {"status": "idle", "caller": None}, to=sid)


@sio.event
async def settings(sid: str, data: dict[str, Any]) -> None:  # noqa: ARG001
    hub.settings.update(data or {})


@sio.event
async def start_call(sid: str) -> None:  # noqa: ARG001
    """Frontend-initiated session; real audio still arrives from Twilio."""
    await sio.emit("call_status", {"status": "connecting", "caller": None})


@sio.event
async def end_call(sid: str) -> None:  # noqa: ARG001
    await sio.emit("call_status", {"status": "ended", "caller": None})


@sio.event
async def disconnect(sid: str) -> None:
    logger.info("Frontend disconnected: %s", sid)
