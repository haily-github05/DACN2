import json
import os
import time
import threading
import urllib.request
from collections import defaultdict
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO
from .detection_counts import deduplicate_detections

# Model giữ nguyên nhãn gốc; chỉ đổi tên trả về cho giao diện.
MODEL_PATH = Path(__file__).resolve().parents[2] / "model" / "best.pt"
LABELS_PATH = Path(__file__).with_name("ingredient_labels_vi.json")
with LABELS_PATH.open(encoding="utf-8") as labels_file:
    LABELS_VI = json.load(labels_file)


def vietnamese_name(label):
    key = " ".join(str(label).strip().lower().replace("_", " ").split())
    # Nhãn mới chưa ánh xạ giữ nguyên để người dùng kiểm tra, không đoán tên.
    return LABELS_VI.get(key, str(label).strip())


model = YOLO(str(MODEL_PATH))  # Nạp model một lần khi dịch vụ khởi động.


def setting(name, default=""):
    if name == "AI_TELEMETRY_SECRET":
        try:
            return (MODEL_PATH.parents[1] / ".ai-telemetry-secret").read_text(encoding="utf-8").strip()
        except OSError:
            pass
    if os.environ.get(name):
        return os.environ[name]
    env_path = MODEL_PATH.parents[1] / ".env"
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip() == name:
                return value.strip().strip('"').strip("'")
    except OSError:
        pass
    return default


def log_scan(status, started_at, error_code=None, authorization=None):
    secret = setting("AI_TELEMETRY_SECRET")
    if not secret:
        return
    payload = json.dumps({
        "status": status,
        "model": MODEL_PATH.name,
        "durationMs": max(0, round((time.monotonic() - started_at) * 1000)),
        "errorCode": error_code,
    }).encode("utf-8")

    def send():
        request = urllib.request.Request(
            setting("AI_TELEMETRY_URL", "http://127.0.0.1:3000/api/ai/telemetry"),
            data=payload,
            headers={"Content-Type": "application/json", "X-AI-Telemetry-Secret": secret, **({"Authorization": authorization} if authorization else {})},
            method="POST",
        )
        try:
            urllib.request.urlopen(request, timeout=2).close()
        except Exception:
            pass  # Telemetry must not interrupt image recognition.

    threading.Thread(target=send, daemon=True).start()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"success": True, "model": str(MODEL_PATH)}

@app.post("/predict")
async def predict(file: UploadFile = File(...), authorization: str | None = Header(default=None)):
    started_at = time.monotonic()
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        log_scan("FAILURE", started_at, "UNSUPPORTED_IMAGE_TYPE", authorization)
        raise HTTPException(400, "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP")

    try:
        image = Image.open(BytesIO(await file.read())).convert("RGB")
    except UnidentifiedImageError:
        log_scan("FAILURE", started_at, "INVALID_IMAGE", authorization)
        raise HTTPException(400, "File gửi lên không phải ảnh hợp lệ")

    try:
        result = model.predict(image, conf=0.35, iou=0.45, verbose=False)[0]
    except Exception as error:
        log_scan("FAILURE", started_at, type(error).__name__, authorization)
        raise HTTPException(503, "Model gặp lỗi khi nhận diện ảnh") from error
    grouped = defaultdict(lambda: {"count": 0, "confidence": 0.0})
    candidates = []

    for box in result.boxes:
        class_id = int(box.cls.item())
        name = vietnamese_name(model.names[class_id])
        confidence = float(box.conf.item())

        candidates.append({
            "name": name,
            "confidence": confidence,
            "box": box.xyxy[0].tolist(),
        })

    # Chỉ đếm một lần khi các class trùng nghĩa nhận cùng một vật thể.
    for item in deduplicate_detections(candidates):
        name = item["name"]
        grouped[name]["count"] += 1
        grouped[name]["confidence"] = max(grouped[name]["confidence"], item["confidence"])

    detections = [
        {
            "name": name,
            "count": value["count"],
            "confidence": round(value["confidence"], 4),
        }
        for name, value in grouped.items()
    ]

    log_scan("SUCCESS", started_at, authorization=authorization)
    return {"success": True, "detections": detections}
