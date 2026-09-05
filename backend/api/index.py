"""Vercel Python serverless entrypoint for the FastAPI backend.

Vercel's Python runtime looks for a module-level ASGI `app`.
Note: Twilio Media Streams (WebSockets) are NOT supported on Vercel serverless —
deploy `backend/Dockerfile` to a container host (Fly.io, Render, Railway, Cloud Run)
if you need the /stream-audio WebSocket endpoint.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402

app = app
