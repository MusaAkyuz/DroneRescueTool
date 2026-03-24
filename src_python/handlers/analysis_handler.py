"""
Analysis Handler - Mock analiz işlemleri.
Gerçek YOLO/Ultralytics entegrasyonu ileride eklenecek.
Şimdilik simüle edilmiş veriler üretir.
"""

import asyncio
import random
import logging
import uuid
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Mock renk paleti
MOCK_COLORS = [
    {"hex": "#228B22", "name": "Orman Yeşili"},
    {"hex": "#8B4513", "name": "Toprak Kahvesi"},
    {"hex": "#87CEEB", "name": "Gökyüzü Mavisi"},
    {"hex": "#808080", "name": "Gri"},
    {"hex": "#006400", "name": "Koyu Yeşil"},
    {"hex": "#D2B48C", "name": "Ten Rengi"},
    {"hex": "#FFFFFF", "name": "Beyaz"},
    {"hex": "#000000", "name": "Siyah"},
    {"hex": "#FF4500", "name": "Kırmızı-Turuncu"},
    {"hex": "#FFD700", "name": "Altın Sarısı"},
    {"hex": "#4682B4", "name": "Çelik Mavisi"},
    {"hex": "#2E8B57", "name": "Deniz Yeşili"},
]

# Mock AI tespit etiketleri
MOCK_LABELS = ["İnsan", "Araç", "Çadır", "Hayvan", "Enkaz", "Işık Kaynağı"]


async def handle_analysis_start(payload: dict) -> Optional[dict]:
    """
    Analiz başlatma isteğini işle.
    Arka planda mock analiz sürecini başlatır ve WebSocket üzerinden
    progress, detection ve color eventlerini push eder.
    """
    files = payload.get("files", [])
    if not files:
        return {"status": "error", "message": "Dosya listesi boş"}

    logger.info(f"Analiz başlatılıyor: {len(files)} dosya")

    # WebSocket server referansını al (payload'da injekte edilecek)
    ws_server = payload.get("_ws_server")

    # Arka plan görevi olarak analizi başlat
    asyncio.create_task(_run_mock_analysis(files, ws_server))

    return {"status": "started", "totalFiles": len(files)}


async def _run_mock_analysis(files: list, ws_server) -> None:
    """Mock analiz süreci - gerçek analiz yerine simülasyon yapar."""
    total_files = len(files)

    for file_index, file_info in enumerate(files):
        file_name = file_info.get("name", f"dosya_{file_index}")
        file_type = file_info.get("type", "image")
        file_path = file_info.get("path", "")

        # Dosya tipine göre toplam frame sayısı belirle
        if file_type == "video":
            total_frames = random.randint(100, 500)
        else:
            total_frames = 1

        logger.info(f"İşleniyor [{file_index + 1}/{total_files}]: {file_name} ({total_frames} kare)")

        # Renk analizi sonuçları bu dosya için birikecek
        file_colors = _generate_mock_colors()

        for frame in range(total_frames):
            # Dosya ilerleme yüzdesi
            file_percent = ((frame + 1) / total_frames) * 100
            # Genel ilerleme yüzdesi
            overall_percent = ((file_index * 100 + file_percent) / total_files)

            # Progress event gönder
            progress_msg = {
                "type": "analysis:progress",
                "payload": {
                    "status": "analyzing",
                    "currentFile": file_name,
                    "currentFileIndex": file_index,
                    "totalFiles": total_files,
                    "overallPercent": round(overall_percent, 1),
                    "filePercent": round(file_percent, 1),
                },
            }
            if ws_server:
                await ws_server.send_message(progress_msg)

            # Rastgele AI tespiti (her 20-60 frame'de bir)
            if random.random() < 0.03 or (file_type == "image" and frame == 0 and random.random() < 0.5):
                detection = _generate_mock_detection(file_name, file_path, frame, total_frames)
                detection_msg = {
                    "type": "analysis:detection",
                    "payload": detection,
                }
                if ws_server:
                    await ws_server.send_message(detection_msg)

            # Renk analizi - her 10 frame'de bir güncelle
            if frame % 10 == 0 or frame == total_frames - 1:
                color_msg = {
                    "type": "analysis:color",
                    "payload": {
                        "fileName": file_name,
                        "totalFrames": total_frames,
                        "processedFrames": frame + 1,
                        "colors": file_colors,
                    },
                }
                if ws_server:
                    await ws_server.send_message(color_msg)

            # Simülasyon hızı
            await asyncio.sleep(0.05)

    # Analiz tamamlandı
    completed_msg = {
        "type": "analysis:progress",
        "payload": {
            "status": "completed",
            "currentFile": "",
            "currentFileIndex": total_files - 1,
            "totalFiles": total_files,
            "overallPercent": 100,
            "filePercent": 100,
        },
    }
    if ws_server:
        await ws_server.send_message(completed_msg)

    logger.info("Analiz tamamlandı!")


def _generate_mock_colors() -> list:
    """Rastgele renk analizi sonuçları üret."""
    num_colors = random.randint(5, 10)
    selected = random.sample(MOCK_COLORS, min(num_colors, len(MOCK_COLORS)))

    # Rastgele yüzdeler oluştur (toplamı 100)
    raw_weights = [random.random() for _ in selected]
    total_weight = sum(raw_weights)
    percentages = [(w / total_weight) * 100 for w in raw_weights]

    colors = []
    for i, color in enumerate(selected):
        count = random.randint(1000, 100000)
        colors.append({
            "hex": color["hex"],
            "name": color["name"],
            "count": count,
            "percentage": round(percentages[i], 1),
            "intensity": random.randint(30, 240),
        })

    # Yüzdeleri normalize et
    total_pct = sum(c["percentage"] for c in colors)
    for c in colors:
        c["percentage"] = round((c["percentage"] / total_pct) * 100, 1)

    return sorted(colors, key=lambda x: x["percentage"], reverse=True)


def _generate_mock_detection(file_name: str, file_path: str, frame: int, total_frames: int) -> dict:
    """Rastgele AI tespiti üret."""
    fps = 30  # Varsayılan FPS
    start_time = frame / fps
    duration = random.uniform(0.5, 3.0)
    end_time = min(start_time + duration, total_frames / fps)

    return {
        "id": str(uuid.uuid4())[:8],
        "fileName": file_name,
        "filePath": file_path,
        "label": random.choice(MOCK_LABELS),
        "confidence": round(random.uniform(0.55, 0.98), 2),
        "startTime": round(start_time, 2),
        "endTime": round(end_time, 2),
        "bbox": {
            "x": random.randint(10, 400),
            "y": random.randint(10, 300),
            "w": random.randint(30, 200),
            "h": random.randint(30, 200),
        },
    }
