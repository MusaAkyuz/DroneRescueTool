"""
WebSocket Server - Python backend için WebSocket sunucusu.
Single Responsibility: Sadece WebSocket bağlantı yönetimi.
"""

import asyncio
import json
import logging
from typing import Optional

import websockets
from websockets.asyncio.server import Server, ServerConnection

logger = logging.getLogger(__name__)


class WebSocketServer:
    """WebSocket sunucusu. Bağlantı yönetimi ve mesaj yönlendirmesi yapar."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8765):
        self._host = host
        self._port = port
        self._server: Optional[Server] = None
        self._client: Optional[ServerConnection] = None
        self._message_handler: Optional[callable] = None

    def set_message_handler(self, handler: callable) -> None:
        """Gelen mesajları işleyecek handler'ı ayarla (Dependency Inversion)."""
        self._message_handler = handler

    async def _handle_connection(self, websocket: ServerConnection) -> None:
        """Yeni bir WebSocket bağlantısını yönet."""
        self._client = websocket
        client_info = websocket.remote_address
        logger.info(f"Electron bağlandı: {client_info}")

        try:
            async for raw_message in websocket:
                try:
                    message = json.loads(raw_message)
                    logger.debug(f"Mesaj alındı: {message.get('type', 'unknown')}")

                    if self._message_handler:
                        response = await self._message_handler(message)
                        if response is not None:
                            await websocket.send(json.dumps(response))
                    else:
                        logger.warning("Mesaj handler tanımlı değil, mesaj göz ardı edildi.")

                except json.JSONDecodeError:
                    error_response = {
                        "type": "error",
                        "payload": {"message": "Geçersiz JSON formatı"},
                    }
                    await websocket.send(json.dumps(error_response))

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Electron bağlantısı kapandı: {client_info}")
        finally:
            self._client = None

    async def send_message(self, message: dict) -> bool:
        """Electron'a mesaj gönder."""
        if self._client is None:
            logger.warning("Gönderilecek aktif bağlantı yok.")
            return False
        try:
            await self._client.send(json.dumps(message))
            return True
        except websockets.exceptions.ConnectionClosed:
            logger.error("Mesaj gönderilirken bağlantı kapandı.")
            self._client = None
            return False

    async def start(self) -> None:
        """Sunucuyu başlat."""
        self._server = await websockets.serve(
            self._handle_connection, self._host, self._port
        )
        logger.info(f"WebSocket sunucusu başlatıldı: ws://{self._host}:{self._port}")

    async def stop(self) -> None:
        """Sunucuyu durdur."""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            logger.info("WebSocket sunucusu durduruldu.")

    @property
    def is_running(self) -> bool:
        return self._server is not None
