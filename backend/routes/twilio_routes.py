"""Twilio webhook + Media Streams routes."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Form, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from config import settings
from services.twilio_stream import StreamSession
from ws_hub import hub

logger = logging.getLogger(__name__)

router = APIRouter(tags=["twilio"])


@router.post("/incoming-call")
async def incoming_call(request: Request, From: str = Form(default="unknown")) -> Response:
    """Twilio voice webhook. Answers the call and opens a Media Stream."""
    base = settings.public_base_url.replace("https://", "").replace("http://", "")
    stream_url = f"wss://{base}/stream-audio"

    await hub.broadcast(
        "call_status", {"status": "connecting", "caller": From}
    )

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to Karacter Hub Deep Call Live.</Say>
  <Connect>
    <Stream url="{stream_url}" />
  </Connect>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.websocket("/stream-audio")
async def stream_audio(websocket: WebSocket) -> None:
    """Receives Twilio Media Stream frames and pushes text to the frontend."""
    await websocket.accept()
    session: StreamSession | None = None

    try:
        while True:
            message = json.loads(await websocket.receive_text())
            event = message.get("event")

            if event == "start":
                call_sid = message["start"]["callSid"]
                prefs = hub.settings
                session = StreamSession(
                    call_sid=call_sid,
                    source_lang=prefs.get("sourceLang", "en"),
                    target_lang=prefs.get("targetLang", settings.default_target_lang),
                    translation_enabled=prefs.get("translationEnabled", True),
                    sound_tuning_enabled=prefs.get("soundTuningEnabled", True),
                )
                await hub.broadcast("call_status", {"status": "active"})

            elif event == "media" and session is not None:
                session.add_payload(message["media"]["payload"])
                if session.ready:
                    result = await session.process()
                    if result["text"]:
                        await hub.broadcast(
                            "transcript",
                            {
                                "id": f"{session.call_sid}-{message['media']['timestamp']}",
                                "speaker": "caller",
                                "text": result["text"],
                                "at": int(message["media"]["timestamp"]),
                            },
                        )
                    if result["translated"]:
                        await hub.broadcast(
                            "translation",
                            {
                                "id": f"{session.call_sid}-{message['media']['timestamp']}",
                                "speaker": "caller",
                                "text": result["translated"],
                                "at": int(message["media"]["timestamp"]),
                            },
                        )

            elif event == "stop":
                break
    except WebSocketDisconnect:
        logger.info("Twilio media stream disconnected")
    except Exception:  # noqa: BLE001
        logger.exception("Error while processing Twilio media stream")
    finally:
        await hub.broadcast("call_status", {"status": "ended", "caller": None})
