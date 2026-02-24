"""
Message Router - Gelen mesajları ilgili handler'lara yönlendirir.
Single Responsibility: Sadece mesaj yönlendirmesi.
Open/Closed: Yeni handler'lar eklenerek genişletilebilir, mevcut kod değiştirilmez.
"""

import logging
from typing import Any, Callable, Awaitable, Optional

logger = logging.getLogger(__name__)

# Handler tipi: async fonksiyon, payload alır, response döner
MessageHandler = Callable[[dict], Awaitable[Optional[dict]]]


class MessageRouter:
    """Mesaj tipine göre handler'lara yönlendirme yapar."""

    def __init__(self):
        self._handlers: dict[str, MessageHandler] = {}

    def register(self, message_type: str, handler: MessageHandler) -> None:
        """Belirli bir mesaj tipi için handler kaydet."""
        self._handlers[message_type] = handler
        logger.debug(f"Handler kaydedildi: {message_type}")

    async def route(self, message: dict) -> Optional[dict]:
        """Gelen mesajı ilgili handler'a yönlendir."""
        msg_type = message.get("type")
        payload = message.get("payload", {})
        request_id = message.get("id")

        if not msg_type:
            return {
                "type": "error",
                "payload": {"message": "Mesaj tipi belirtilmedi"},
            }

        handler = self._handlers.get(msg_type)
        if not handler:
            logger.warning(f"Bilinmeyen mesaj tipi: {msg_type}")
            return {
                "type": "error",
                "payload": {"message": f"Bilinmeyen mesaj tipi: {msg_type}"},
            }

        try:
            result = await handler(payload)
            response = {
                "type": f"{msg_type}:response",
                "payload": result or {},
            }
            if request_id:
                response["id"] = request_id
            return response

        except Exception as e:
            logger.error(f"Handler hatası ({msg_type}): {e}", exc_info=True)
            response = {
                "type": "error",
                "payload": {"message": str(e), "source": msg_type},
            }
            if request_id:
                response["id"] = request_id
            return response
