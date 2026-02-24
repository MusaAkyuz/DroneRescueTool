"""
Health Handler - Bağlantı sağlık kontrolü.
İlk bağlantı testi için kullanılır.
"""

import platform
import sys
from typing import Optional


async def handle_ping(payload: dict) -> Optional[dict]:
    """Ping mesajına pong ile yanıt ver."""
    return {
        "status": "ok",
        "message": "pong",
        "python_version": sys.version,
        "platform": platform.system(),
    }


async def handle_health_check(payload: dict) -> Optional[dict]:
    """Detaylı sağlık kontrolü."""
    health_info = {
        "status": "healthy",
        "python_version": sys.version,
        "platform": platform.system(),
        "services": {
            "websocket": "running",
            # İleride YOLO, Ultralytics vb. servis durumları buraya eklenecek
        },
    }
    return health_info
