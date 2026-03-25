"""
Analysis Handler - Video/görüntü renk analizi ve AI tespit işlemleri.

MOCK_DATA_ENABLED=1 ortam değişkeni ile mock veri moduna geçilebilir.
Varsayılan: gerçek analiz (OpenCV ile video frame'lerinden renk çıkarımı).
"""

import asyncio
import random
import logging
import uuid
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Mock Modu ───
# MOCK_DATA_ENABLED=1 → mock veri üret, MOCK_DATA_ENABLED=0 veya yok → gerçek analiz
MOCK_DATA_ENABLED = os.environ.get("MOCK_DATA_ENABLED", "0") == "1"

if MOCK_DATA_ENABLED:
    logger.info("⚠️  Mock veri modu aktif (MOCK_DATA_ENABLED=1)")
else:
    logger.info("✅ Gerçek analiz modu aktif")

# ─── 256 Renk Grubu ───
# RGB renk uzayını 256 gruba böl: R=8 seviye, G=8 seviye, B=4 seviye (8×8×4=256)
R_LEVELS = 8
G_LEVELS = 8
B_LEVELS = 4


def _build_color_groups():
    """256 renk grubunu önceden oluştur. Her grup bir index ve temsili hex rengine sahip."""
    groups = []
    r_step = 256 / R_LEVELS
    g_step = 256 / G_LEVELS
    b_step = 256 / B_LEVELS
    for ri in range(R_LEVELS):
        for gi in range(G_LEVELS):
            for bi in range(B_LEVELS):
                r = int(ri * r_step + r_step / 2)
                g = int(gi * g_step + g_step / 2)
                b = int(bi * b_step + b_step / 2)
                r = min(r, 255)
                g = min(g, 255)
                b = min(b, 255)
                hex_color = f"#{r:02X}{g:02X}{b:02X}"
                groups.append({
                    "groupIndex": len(groups),
                    "hex": hex_color,
                })
    return groups


COLOR_GROUPS_256 = _build_color_groups()  # 256 adet

# Mock AI tespit etiketleri
MOCK_LABELS = ["İnsan", "Araç", "Çadır", "Hayvan", "Enkaz", "Işık Kaynağı"]


def _rgb_to_group_index(r: int, g: int, b: int) -> int:
    """Bir RGB pikselini 256 gruptan birine ata."""
    ri = min(int(r / (256 / R_LEVELS)), R_LEVELS - 1)
    gi = min(int(g / (256 / G_LEVELS)), G_LEVELS - 1)
    bi = min(int(b / (256 / B_LEVELS)), B_LEVELS - 1)
    return ri * (G_LEVELS * B_LEVELS) + gi * B_LEVELS + bi


# ─── Handler ───

async def handle_analysis_start(payload: dict) -> Optional[dict]:
    """
    Analiz başlatma isteğini işle.
    MOCK_DATA_ENABLED'a göre mock veya gerçek analiz başlatır.
    """
    files = payload.get("files", [])
    if not files:
        return {"status": "error", "message": "Dosya listesi boş"}

    logger.info(f"Analiz başlatılıyor: {len(files)} dosya (mock={MOCK_DATA_ENABLED})")

    ws_server = payload.get("_ws_server")

    if MOCK_DATA_ENABLED:
        asyncio.create_task(_run_mock_analysis(files, ws_server))
    else:
        asyncio.create_task(_run_real_analysis(files, ws_server))

    return {"status": "started", "totalFiles": len(files)}


# ═══════════════════════════════════════════════════════════════
# GERÇEK ANALİZ (OpenCV)
# ═══════════════════════════════════════════════════════════════

async def _run_real_analysis(files: list, ws_server) -> None:
    """Gerçek video/görüntü analizi - OpenCV ile frame'lerden renk çıkarımı."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        logger.error("opencv-python veya numpy yüklü değil! pip install opencv-python numpy")
        if ws_server:
            await ws_server.send_message({
                "type": "analysis:progress",
                "payload": {
                    "status": "error",
                    "currentFile": "",
                    "currentFileIndex": 0,
                    "totalFiles": len(files),
                    "overallPercent": 0,
                    "filePercent": 0,
                    "message": "opencv-python veya numpy yüklü değil",
                },
            })
        return

    total_files = len(files)

    for file_index, file_info in enumerate(files):
        file_name = file_info.get("name", f"dosya_{file_index}")
        file_type = file_info.get("type", "image")
        file_path = file_info.get("path", "")

        if file_type == "video":
            await _analyze_video(cv2, np, file_path, file_name, file_index, total_files, ws_server)
        else:
            await _analyze_image(cv2, np, file_path, file_name, file_index, total_files, ws_server)

    # Analiz tamamlandı
    if ws_server:
        await ws_server.send_message({
            "type": "analysis:progress",
            "payload": {
                "status": "completed",
                "currentFile": "",
                "currentFileIndex": total_files - 1,
                "totalFiles": total_files,
                "overallPercent": 100,
                "filePercent": 100,
            },
        })
    logger.info("Gerçek analiz tamamlandı!")


async def _analyze_video(cv2, np, file_path: str, file_name: str,
                         file_index: int, total_files: int, ws_server) -> None:
    """Bir video dosyasını frame frame analiz et."""
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        logger.error(f"Video açılamadı: {file_path}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if total_frames <= 0:
        total_frames = 1

    logger.info(f"Video analizi: {file_name} — {total_frames} kare, {fps:.1f} FPS")

    # Her saniyeden 1 frame örnekle (performans için her frame'i analiz etmiyoruz)
    sample_interval = max(1, int(fps))  # ~1 frame/saniye

    # 256 grup için: [count, [frame_indices]]
    group_counts = [0] * 256
    group_frames: list[list[int]] = [[] for _ in range(256)]
    total_pixels_sampled = 0
    processed_frames = 0

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Sadece sample_interval'da bir frame analiz et
        if frame_idx % sample_interval == 0:
            # Frame'i küçült (performans — 160x120 yeterli renk dağılımı için)
            small = cv2.resize(frame, (160, 120), interpolation=cv2.INTER_AREA)
            # BGR → RGB
            rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            pixels = rgb.reshape(-1, 3)

            for r, g, b in pixels:
                idx = _rgb_to_group_index(int(r), int(g), int(b))
                group_counts[idx] += 1
                # Frame listesine ekle (aynı frame'i tekrar ekleme)
                if len(group_frames[idx]) == 0 or group_frames[idx][-1] != frame_idx:
                    group_frames[idx].append(frame_idx)

            total_pixels_sampled += len(pixels)
            processed_frames += 1

        frame_idx += 1

        # Her 30 frame'de bir progress + color gönder
        if frame_idx % 30 == 0 or frame_idx == total_frames:
            file_percent = (frame_idx / total_frames) * 100
            overall_percent = ((file_index * 100 + file_percent) / total_files)

            if ws_server:
                await ws_server.send_message({
                    "type": "analysis:progress",
                    "payload": {
                        "status": "analyzing",
                        "currentFile": file_name,
                        "currentFileIndex": file_index,
                        "totalFiles": total_files,
                        "overallPercent": round(overall_percent, 1),
                        "filePercent": round(file_percent, 1),
                    },
                })

                # Renk sonuçlarını gönder
                colors = _build_color_result(group_counts, group_frames, total_pixels_sampled)
                await ws_server.send_message({
                    "type": "analysis:color",
                    "payload": {
                        "fileName": file_name,
                        "filePath": file_path,
                        "totalFrames": total_frames,
                        "processedFrames": processed_frames,
                        "fps": round(fps, 2),
                        "colors": colors,
                    },
                })

            # Event loop'a nefes aldır
            await asyncio.sleep(0)

    cap.release()
    logger.info(f"Video analizi tamamlandı: {file_name} — {processed_frames} frame örneklendi")


async def _analyze_image(cv2, np, file_path: str, file_name: str,
                         file_index: int, total_files: int, ws_server) -> None:
    """Bir görüntü dosyasını analiz et."""
    img = cv2.imread(file_path)
    if img is None:
        logger.error(f"Görüntü okunamadı: {file_path}")
        return

    # Küçült
    small = cv2.resize(img, (320, 240), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape(-1, 3)

    group_counts = [0] * 256
    group_frames: list[list[int]] = [[] for _ in range(256)]

    for r, g, b in pixels:
        idx = _rgb_to_group_index(int(r), int(g), int(b))
        group_counts[idx] += 1
        if len(group_frames[idx]) == 0:
            group_frames[idx].append(0)

    total_pixels = len(pixels)
    colors = _build_color_result(group_counts, group_frames, total_pixels)

    file_percent = 100
    overall_percent = ((file_index * 100 + file_percent) / total_files)

    if ws_server:
        await ws_server.send_message({
            "type": "analysis:progress",
            "payload": {
                "status": "analyzing",
                "currentFile": file_name,
                "currentFileIndex": file_index,
                "totalFiles": total_files,
                "overallPercent": round(overall_percent, 1),
                "filePercent": round(file_percent, 1),
            },
        })
        await ws_server.send_message({
            "type": "analysis:color",
            "payload": {
                "fileName": file_name,
                "filePath": file_path,
                "totalFrames": 1,
                "processedFrames": 1,
                "fps": 1,
                "colors": colors,
            },
        })

    logger.info(f"Görüntü analizi tamamlandı: {file_name}")


def _build_color_result(group_counts: list, group_frames: list, total_pixels: int) -> list:
    """Renk grubu sayaçlarından API yanıtı oluştur."""
    if total_pixels == 0:
        return []

    colors = []
    for idx in range(256):
        count = group_counts[idx]
        if count == 0:
            continue
        pct = (count / total_pixels) * 100
        group = COLOR_GROUPS_256[idx]
        colors.append({
            "hex": group["hex"],
            "groupIndex": idx,
            "count": count,
            "percentage": round(pct, 2),
            "frames": group_frames[idx],
        })

    return sorted(colors, key=lambda x: x["percentage"], reverse=True)


# ═══════════════════════════════════════════════════════════════
# MOCK ANALİZ
# ═══════════════════════════════════════════════════════════════

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

        logger.info(f"[MOCK] İşleniyor [{file_index + 1}/{total_files}]: {file_name} ({total_frames} kare)")

        # Mock renk analizi (frame bilgisi dahil)
        file_colors = _generate_mock_colors(total_frames)

        for frame in range(total_frames):
            file_percent = ((frame + 1) / total_frames) * 100
            overall_percent = ((file_index * 100 + file_percent) / total_files)

            # Progress
            if ws_server:
                await ws_server.send_message({
                    "type": "analysis:progress",
                    "payload": {
                        "status": "analyzing",
                        "currentFile": file_name,
                        "currentFileIndex": file_index,
                        "totalFiles": total_files,
                        "overallPercent": round(overall_percent, 1),
                        "filePercent": round(file_percent, 1),
                    },
                })

            # Rastgele AI tespiti
            if random.random() < 0.03 or (file_type == "image" and frame == 0 and random.random() < 0.5):
                detection = _generate_mock_detection(file_name, file_path, frame, total_frames)
                if ws_server:
                    await ws_server.send_message({
                        "type": "analysis:detection",
                        "payload": detection,
                    })

            # Renk analizi - her 10 frame'de bir
            if frame % 10 == 0 or frame == total_frames - 1:
                if ws_server:
                    await ws_server.send_message({
                        "type": "analysis:color",
                        "payload": {
                            "fileName": file_name,
                            "filePath": file_path,
                            "totalFrames": total_frames,
                            "processedFrames": frame + 1,
                            "fps": 30,
                            "colors": file_colors,
                        },
                    })

            await asyncio.sleep(0.05)

    # Tamamlandı
    if ws_server:
        await ws_server.send_message({
            "type": "analysis:progress",
            "payload": {
                "status": "completed",
                "currentFile": "",
                "currentFileIndex": total_files - 1,
                "totalFiles": total_files,
                "overallPercent": 100,
                "filePercent": 100,
            },
        })
    logger.info("[MOCK] Analiz tamamlandı!")


def _generate_mock_colors(total_frames: int) -> list:
    """
    256 renk grubundan mock renk dağılımı üret.
    Her renk için hangi frame'lerde görüldüğü bilgisi de eklenir.
    """
    active_count = random.randint(40, 120)
    active_indices = sorted(random.sample(range(256), active_count))

    raw_weights = [random.paretovariate(0.8) for _ in active_indices]
    total_weight = sum(raw_weights)
    total_pixels = random.randint(500_000, 5_000_000)

    # Her renk grubu için rastgele frame listesi oluştur
    all_frames = list(range(total_frames))

    colors = []
    for i, group_idx in enumerate(active_indices):
        group = COLOR_GROUPS_256[group_idx]
        pct = (raw_weights[i] / total_weight) * 100
        count = max(1, int((pct / 100) * total_pixels))

        # Yüzdeye orantılı sayıda frame'de görünsün
        # Baskın renkler daha çok frame'de, nadir renkler az frame'de
        frame_count = max(1, int((pct / 100) * total_frames * 0.8))
        frame_count = min(frame_count, total_frames)
        frames = sorted(random.sample(all_frames, frame_count))

        colors.append({
            "hex": group["hex"],
            "groupIndex": group["groupIndex"],
            "count": count,
            "percentage": round(pct, 2),
            "frames": frames,
        })

    # Yüzdeleri normalize et
    total_pct = sum(c["percentage"] for c in colors)
    for c in colors:
        c["percentage"] = round((c["percentage"] / total_pct) * 100, 2)

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
