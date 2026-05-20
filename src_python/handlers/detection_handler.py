"""
Detection Handler - Birleşik Video İşleme (YOLO + Renk Analizi)

Tek bir video açılışı ile hem YOLO tespiti hem renk analizi yapılır.
- YOLO: Her N frame'de bir (varsayılan 10), 640p'ye küçültülmüş frame ile
- Renk: Her M frame'de bir (varsayılan 30) NumPy vektörizasyonu ile
- Renk sonuçları en sonda gönderilir
- Thumbnail yalnızca grup gönderilirken oluşturulur (bellekte tutulmaz)
- İlerleme ayrı ayrı raporlanır (detection:progress + color:progress)
"""

import asyncio
import logging
import os
import sys
import uuid
import base64
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Model dizini - frozen (PyInstaller exe) ve dev modunu destekle
if getattr(sys, 'frozen', False):
    # PyInstaller ile derlenmiş exe olarak çalışıyor
    # Exe konumu: resources/python_backend/python_backend.exe
    # Model konumu: resources/models/best.pt
    _EXE_DIR = os.path.dirname(sys.executable)
    _RESOURCES_DIR = os.path.dirname(_EXE_DIR)
    MODELS_DIR = os.path.join(_RESOURCES_DIR, "models")
else:
    # Geliştirme modunda script olarak çalışıyor
    _HANDLER_DIR = os.path.dirname(os.path.abspath(__file__))
    _SRC_PYTHON_DIR = os.path.dirname(_HANDLER_DIR)
    _PROJECT_ROOT = os.path.dirname(_SRC_PYTHON_DIR)
    MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")

MODEL_PATH = os.path.join(MODELS_DIR, "best.pt")

# YOLO model instance (lazy load)
_yolo_model = None

# ─── Varsayılan aralıklar ───
DEFAULT_YOLO_INTERVAL = 10   # Her 10 frame'de bir YOLO
DEFAULT_COLOR_INTERVAL = 30  # Her 30 frame'de bir renk analizi

# ─── 256 Renk Grubu (NumPy optimized) ───
R_LEVELS = 8
G_LEVELS = 8
B_LEVELS = 4


def _build_color_palette():
    """256 renk grubunun hex değerlerini oluştur."""
    palette = []
    r_step = 256 / R_LEVELS
    g_step = 256 / G_LEVELS
    b_step = 256 / B_LEVELS
    for ri in range(R_LEVELS):
        for gi in range(G_LEVELS):
            for bi in range(B_LEVELS):
                r = min(int(ri * r_step + r_step / 2), 255)
                g = min(int(gi * g_step + g_step / 2), 255)
                b = min(int(bi * b_step + b_step / 2), 255)
                palette.append(f"#{r:02X}{g:02X}{b:02X}")
    return palette


COLOR_PALETTE_HEX = _build_color_palette()  # 256 hex string


def _vectorized_color_analysis(frame_bgr, found_mask: np.ndarray) -> None:
    """
    NumPy vektörizasyonu ile frame'deki tüm pikselleri 256 renk grubuna ata.
    found_mask: 256 bool array — bulunan gruplar True olarak işaretlenir.
    """
    # Küçült (160x120 = 19200 piksel yeterli)
    small = cv2.resize(frame_bgr, (160, 120), interpolation=cv2.INTER_AREA)
    # BGR → RGB
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape(-1, 3).astype(np.int32)

    # Vektörize index hesaplaması
    r_idx = np.minimum(pixels[:, 0] * R_LEVELS // 256, R_LEVELS - 1)
    g_idx = np.minimum(pixels[:, 1] * G_LEVELS // 256, G_LEVELS - 1)
    b_idx = np.minimum(pixels[:, 2] * B_LEVELS // 256, B_LEVELS - 1)
    group_indices = r_idx * (G_LEVELS * B_LEVELS) + g_idx * B_LEVELS + b_idx

    # Bulunan grupları işaretle
    unique_groups = np.unique(group_indices)
    found_mask[unique_groups] = True


def _get_model():
    """YOLO modelini lazy-load et."""
    global _yolo_model
    if _yolo_model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"YOLO model dosyası bulunamadı: {MODEL_PATH}\n"
                f"Lütfen models/ dizinine best.pt dosyanızı yerleştirin."
            )
        from ultralytics import YOLO
        logger.info(f"YOLO modeli yükleniyor: {MODEL_PATH}")
        _yolo_model = YOLO(MODEL_PATH)
        logger.info("YOLO modeli başarıyla yüklendi.")
    return _yolo_model


def _frame_to_base64_thumbnail(frame, max_width=320) -> str:
    """Frame'i küçük base64 JPEG thumbnail'e çevir."""
    h, w = frame.shape[:2]
    scale = max_width / w
    new_w = max_width
    new_h = int(h * scale)
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
    _, buffer = cv2.imencode('.jpg', resized, [cv2.IMWRITE_JPEG_QUALITY, 75])
    b64 = base64.b64encode(buffer).decode('utf-8')
    del resized, buffer
    return b64


def _frame_to_annotated_thumbnail(frame, detections: list, max_width=320) -> str:
    """Frame'i küçültüp üzerine bbox kutuları çizerek base64 JPEG thumbnail üret."""
    h, w = frame.shape[:2]
    scale = max_width / w
    new_w = max_width
    new_h = int(h * scale)
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Renk paleti (farklı tespitler farklı renklerde)
    colors = [
        (0, 0, 255),    # kırmızı (BGR)
        (0, 165, 255),  # turuncu
        (0, 255, 255),  # sarı
        (0, 255, 0),    # yeşil
        (255, 255, 0),  # cyan
        (255, 0, 255),  # magenta
        (255, 0, 0),    # mavi
    ]

    for i, det in enumerate(detections):
        bbox = det.get("bbox", {})
        # bbox orijinal frame koordinatlarında — thumbnail'e ölçekle
        x = int(bbox.get("x", 0) * scale)
        y = int(bbox.get("y", 0) * scale)
        bw = int(bbox.get("w", 0) * scale)
        bh = int(bbox.get("h", 0) * scale)
        color = colors[i % len(colors)]

        # Kutu çiz
        cv2.rectangle(resized, (x, y), (x + bw, y + bh), color, 2)

        # Etiket
        label = det.get("label", "")
        conf = det.get("confidence", 0)
        text = f"{label} {conf:.0%}"
        font_scale = 0.4
        thickness = 1
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        # Etiket arka planı
        cv2.rectangle(resized, (x, y - th - 4), (x + tw + 2, y), color, -1)
        cv2.putText(resized, text, (x + 1, y - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness)

    _, buffer = cv2.imencode('.jpg', resized, [cv2.IMWRITE_JPEG_QUALITY, 80])
    b64 = base64.b64encode(buffer).decode('utf-8')
    del resized, buffer
    return b64


def _resize_for_yolo(frame, max_dim=640):
    """Frame'i YOLO'ya vermeden önce max_dim'e küçült (RAM tasarrufu)."""
    h, w = frame.shape[:2]
    if max(h, w) <= max_dim:
        return frame, 1.0
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    small = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return small, scale


async def handle_detection_start(payload: dict) -> Optional[dict]:
    """
    Birleşik analiz başlat: YOLO + Renk analizi tek video açılışında.
    """
    files = payload.get("files", [])
    if not files:
        return {"status": "error", "message": "Dosya listesi boş"}

    # Model kontrolü
    if not os.path.exists(MODEL_PATH):
        return {
            "status": "error",
            "message": "Model dosyası bulunamadı. Lütfen models/ dizinine best.pt dosyanızı yerleştirin."
        }

    ws_server = payload.get("_ws_server")
    confidence = payload.get("confidence", 0.25)
    yolo_interval = max(1, int(payload.get("yoloInterval", DEFAULT_YOLO_INTERVAL)))
    color_interval = max(1, int(payload.get("colorInterval", DEFAULT_COLOR_INTERVAL)))

    logger.info(
        f"Birleşik analiz başlatılıyor: {len(files)} dosya, "
        f"confidence={confidence}, yoloInterval={yolo_interval}, colorInterval={color_interval}"
    )

    asyncio.create_task(_run_unified_analysis(files, ws_server, confidence, yolo_interval, color_interval))

    return {"status": "started", "totalFiles": len(files)}


async def _run_unified_analysis(files: list, ws_server, confidence: float,
                                yolo_interval: int, color_interval: int) -> None:
    """Tüm dosyalar için birleşik YOLO + Renk analizi."""
    try:
        model = _get_model()
    except (FileNotFoundError, Exception) as e:
        logger.error(f"Model yükleme hatası: {e}")
        if ws_server:
            await ws_server.send_message({
                "type": "detection:progress",
                "payload": {
                    "status": "error",
                    "message": str(e),
                    "currentFile": "",
                    "currentFileIndex": 0,
                    "totalFiles": len(files),
                    "overallPercent": 0,
                    "filePercent": 0,
                    "currentFrame": 0,
                    "totalFrames": 0,
                },
            })
        return

    total_files = len(files)

    for file_index, file_info in enumerate(files):
        file_name = file_info.get("name", f"dosya_{file_index}")
        file_type = file_info.get("type", "image")
        file_path = file_info.get("path", "")

        if file_type == "video":
            await _process_video_unified(
                model, file_path, file_name, file_index, total_files,
                ws_server, confidence, yolo_interval, color_interval
            )
        else:
            await _process_image_unified(model, file_path, file_name, file_index, total_files, ws_server, confidence)

    # Tamamlandı sinyalleri
    if ws_server:
        await ws_server.send_message({
            "type": "detection:progress",
            "payload": {
                "status": "completed",
                "currentFile": "",
                "currentFileIndex": total_files - 1,
                "totalFiles": total_files,
                "overallPercent": 100,
                "filePercent": 100,
                "currentFrame": 0,
                "totalFrames": 0,
            },
        })
        await ws_server.send_message({
            "type": "color:progress",
            "payload": {
                "status": "completed",
                "overallPercent": 100,
            },
        })
    logger.info("Birleşik analiz tamamlandı!")


async def _process_video_unified(model, file_path: str, file_name: str,
                                  file_index: int, total_files: int, ws_server,
                                  confidence: float, yolo_interval: int, color_interval: int) -> None:
    """Tek video açılışı: YOLO (her N frame) + Renk (her M frame)."""
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        logger.error(f"Video açılamadı: {file_path}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if total_frames <= 0:
        total_frames = 1

    logger.info(
        f"Birleşik analiz: {file_name} — {total_frames} kare, {fps:.1f} FPS, "
        f"YOLO her {yolo_interval}, Renk her {color_interval} frame"
    )

    # YOLO state — thumbnail tutmadan sadece bbox/label bilgisi
    consecutive_detections: list[dict] = []
    # Orijinal frame'leri grup gönderiminde thumbnail oluşturmak için geçici tut
    consecutive_frames: list[np.ndarray] = []
    frame_idx = 0

    # Renk state — sadece boolean palette (256 slot)
    color_found_mask = np.zeros(256, dtype=bool)
    color_frames_processed = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        run_yolo = (frame_idx % yolo_interval == 0)
        run_color = (frame_idx % color_interval == 0)

        # ═══ YOLO TESPİT (her N frame) ═══
        if run_yolo:
            # 640p'ye küçült — büyük array'i bellekten düşür
            small_frame, scale = _resize_for_yolo(frame, 640)
            results = model.predict(small_frame, conf=confidence, verbose=False, imgsz=640)

            frame_has_detection = False
            frame_detections = []

            if results and len(results) > 0:
                result = results[0]
                if result.boxes is not None and len(result.boxes) > 0:
                    frame_has_detection = True
                    for box in result.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf_val = float(box.conf[0])
                        cls_id = int(box.cls[0])
                        label = model.names[cls_id] if cls_id < len(model.names) else f"class_{cls_id}"

                        # bbox'ları orijinal boyuta geri ölçekle
                        inv_scale = 1.0 / scale
                        frame_detections.append({
                            "label": label,
                            "confidence": round(conf_val, 3),
                            "bbox": {
                                "x": round(x1 * inv_scale),
                                "y": round(y1 * inv_scale),
                                "w": round((x2 - x1) * inv_scale),
                                "h": round((y2 - y1) * inv_scale),
                            },
                        })

            del small_frame, results

            if frame_has_detection:
                consecutive_detections.append({
                    "frameIndex": frame_idx,
                    "time": round(frame_idx / fps, 3),
                    "detections": frame_detections,
                })
                # Orijinal frame'i thumbnail için sakla
                consecutive_frames.append(frame.copy())
            else:
                # Ardışık tespit dizisi kırıldı — grubu gönder
                if len(consecutive_detections) > 0:
                    group = _create_detection_group_with_thumbnails(
                        consecutive_detections, consecutive_frames, file_name, file_path, fps
                    )
                    if ws_server:
                        await ws_server.send_message({
                            "type": "detection:group",
                            "payload": group,
                        })
                    consecutive_detections = []
                    consecutive_frames = []

        # ═══ RENK ANALİZİ (her M frame'de bir) ═══
        if run_color:
            _vectorized_color_analysis(frame, color_found_mask)
            color_frames_processed += 1

        # Frame ve sonuçları bellekten düşür
        del frame

        frame_idx += 1

        # Progress güncelle (her 5 frame'de bir)
        if frame_idx % 5 == 0 or frame_idx == total_frames:
            file_percent = (frame_idx / total_frames) * 100
            overall_percent = ((file_index * 100 + file_percent) / total_files)

            if ws_server:
                await ws_server.send_message({
                    "type": "detection:progress",
                    "payload": {
                        "status": "analyzing",
                        "currentFile": file_name,
                        "currentFileIndex": file_index,
                        "totalFiles": total_files,
                        "overallPercent": round(overall_percent, 1),
                        "filePercent": round(file_percent, 1),
                        "currentFrame": frame_idx,
                        "totalFrames": total_frames,
                    },
                })
                await ws_server.send_message({
                    "type": "color:progress",
                    "payload": {
                        "status": "analyzing",
                        "overallPercent": round(overall_percent, 1),
                        "framesProcessed": color_frames_processed,
                    },
                })

            await asyncio.sleep(0)

    # Video bitti — kalan ardışık tespitleri gönder
    if len(consecutive_detections) > 0:
        group = _create_detection_group_with_thumbnails(
            consecutive_detections, consecutive_frames, file_name, file_path, fps
        )
        if ws_server:
            await ws_server.send_message({
                "type": "detection:group",
                "payload": group,
            })

    cap.release()

    # ═══ RENK SONUÇLARINI EN SONDA GÖNDER ═══
    if ws_server:
        palette_result = _build_palette_result(color_found_mask)
        await ws_server.send_message({
            "type": "analysis:color",
            "payload": {
                "fileName": file_name,
                "filePath": file_path,
                "totalFrames": total_frames,
                "processedFrames": color_frames_processed,
                "fps": round(fps, 2),
                "palette": palette_result,
            },
        })

    logger.info(f"Birleşik analiz tamamlandı: {file_name} — {color_frames_processed} renk frame")


async def _process_image_unified(model, file_path: str, file_name: str,
                                  file_index: int, total_files: int, ws_server, confidence: float) -> None:
    """Tek görüntü: YOLO + Renk analizi."""
    img = cv2.imread(file_path)
    if img is None:
        logger.error(f"Görüntü okunamadı: {file_path}")
        return

    # YOLO — 640p'ye küçült
    small_img, scale = _resize_for_yolo(img, 640)
    results = model.predict(small_img, conf=confidence, verbose=False, imgsz=640)
    del small_img

    frame_detections = []
    if results and len(results) > 0:
        result = results[0]
        if result.boxes is not None and len(result.boxes) > 0:
            inv_scale = 1.0 / scale
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf_val = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = model.names[cls_id] if cls_id < len(model.names) else f"class_{cls_id}"
                frame_detections.append({
                    "label": label,
                    "confidence": round(conf_val, 3),
                    "bbox": {
                        "x": round(x1 * inv_scale),
                        "y": round(y1 * inv_scale),
                        "w": round((x2 - x1) * inv_scale),
                        "h": round((y2 - y1) * inv_scale),
                    },
                })

    del results

    # Thumbnail'i orijinal frame'den bbox çizili oluştur
    thumbnail = _frame_to_annotated_thumbnail(img, frame_detections) if frame_detections else ""

    group = {
        "id": str(uuid.uuid4()),
        "fileName": file_name,
        "filePath": file_path,
        "startFrame": 0,
        "endFrame": 0,
        "startTime": 0,
        "endTime": 0,
        "frameCount": 1,
        "frames": [{
            "frameIndex": 0,
            "time": 0,
            "detections": frame_detections,
            "thumbnail": thumbnail,
        }],
    }

    if ws_server:
        await ws_server.send_message({
            "type": "detection:group",
            "payload": group,
        })

    # Renk analizi
    color_found_mask = np.zeros(256, dtype=bool)
    _vectorized_color_analysis(img, color_found_mask)
    del img

    if ws_server:
        palette_result = _build_palette_result(color_found_mask)
        await ws_server.send_message({
            "type": "analysis:color",
            "payload": {
                "fileName": file_name,
                "filePath": file_path,
                "totalFrames": 1,
                "processedFrames": 1,
                "fps": 1,
                "palette": palette_result,
            },
        })

        file_percent = 100
        overall_percent = ((file_index * 100 + file_percent) / total_files)
        await ws_server.send_message({
            "type": "detection:progress",
            "payload": {
                "status": "analyzing",
                "currentFile": file_name,
                "currentFileIndex": file_index,
                "totalFiles": total_files,
                "overallPercent": round(overall_percent, 1),
                "filePercent": 100,
                "currentFrame": 1,
                "totalFrames": 1,
            },
        })

    logger.info(f"Görüntü birleşik analiz tamamlandı: {file_name} — {len(frame_detections)} tespit")


def _build_palette_result(found_mask: np.ndarray) -> list:
    """256 renk paletinden found/not-found listesi oluştur."""
    palette = []
    for idx in range(256):
        palette.append({
            "groupIndex": idx,
            "hex": COLOR_PALETTE_HEX[idx],
            "found": bool(found_mask[idx]),
        })
    return palette


def _create_detection_group_with_thumbnails(consecutive: list, frames: list,
                                             file_name: str, file_path: str, fps: float) -> dict:
    """Ardışık tespit frame'lerinden bir grup oluştur — thumbnail'ler bbox çizili üretilir."""
    start_frame = consecutive[0]["frameIndex"]
    end_frame = consecutive[-1]["frameIndex"]

    # Her frame için annotated thumbnail oluştur (bbox çizili)
    frames_with_thumbnails = []
    for i, det in enumerate(consecutive):
        thumbnail = ""
        if i < len(frames):
            thumbnail = _frame_to_annotated_thumbnail(frames[i], det.get("detections", []))
        frames_with_thumbnails.append({
            **det,
            "thumbnail": thumbnail,
        })

    # Frame array'lerini bellekten düşür
    frames.clear()

    return {
        "id": str(uuid.uuid4()),
        "fileName": file_name,
        "filePath": file_path,
        "startFrame": start_frame,
        "endFrame": end_frame,
        "startTime": round(start_frame / fps, 3),
        "endTime": round(end_frame / fps, 3),
        "frameCount": len(frames_with_thumbnails),
        "frames": frames_with_thumbnails,
    }
