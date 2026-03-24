"""
DroneRescueTool - Python Backend
WebSocket sunucusu üzerinden Electron ile haberleşir.
Görüntü işleme (YOLO, Ultralytics) ve dosya işleme görevlerini yürütür.
"""

import asyncio
import logging
import signal
import sys

from server.websocket_server import WebSocketServer
from server.message_router import MessageRouter
from handlers.health_handler import handle_ping, handle_health_check
from handlers.analysis_handler import handle_analysis_start

# Logging yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("DroneRescueTool")

# Varsayılan port (Electron tarafından da aynı port kullanılacak)
WS_PORT = 8765


def create_router(server: WebSocketServer) -> MessageRouter:
    """Mesaj router'ı oluştur ve handler'ları kaydet."""
    router = MessageRouter()

    # Context: WebSocket server referansını handler'lara paylaş
    router.set_context("ws_server", server)

    # Temel handler'lar
    router.register("ping", handle_ping)
    router.register("health:check", handle_health_check)

    # Analiz handler'ları
    router.register("analysis:start", handle_analysis_start)

    return router


async def main():
    """Ana giriş noktası."""
    logger.info("DroneRescueTool Python Backend başlatılıyor...")

    # Bileşenleri oluştur (Dependency Injection)
    server = WebSocketServer(host="127.0.0.1", port=WS_PORT)
    router = create_router(server)

    # Router'ı sunucuya bağla
    server.set_message_handler(router.route)

    # Sunucuyu başlat
    await server.start()
    logger.info(f"Python backend hazır. Port: {WS_PORT}")

    # Graceful shutdown
    stop_event = asyncio.Event()

    def signal_handler():
        logger.info("Kapatma sinyali alındı...")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows'ta signal handler farklı çalışır
            pass

    try:
        await stop_event.wait()
    except KeyboardInterrupt:
        logger.info("Klavye ile kapatma isteği...")
    finally:
        await server.stop()
        logger.info("Python backend kapatıldı.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
