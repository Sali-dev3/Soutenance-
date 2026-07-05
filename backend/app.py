import os
import uuid
from pathlib import Path
from typing import Annotated, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.database import UPLOAD_ROOT, create_report, delete_report, get_report_by_id, get_reports, get_stats, init_db, update_report_status

init_db()

app = FastAPI(title="WakatKoom API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_CREDENTIALS = {"admin": "onea2026"}


def _save_upload(file: Optional[UploadFile], folder: str) -> Optional[str]:
    if not file or not file.filename:
        return None
    extension = Path(file.filename).suffix or ".bin"
    dest_name = f"{uuid.uuid4().hex}{extension}"
    target_dir = UPLOAD_ROOT / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / dest_name
    with target_path.open("wb") as handle:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
    return str(target_path.name)


def _get_admin_from_token(authorization: Optional[str]) -> None:
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != "onea_admin_token":
        raise HTTPException(status_code=401, detail="Token invalide")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "wakatkoom-api"}


@app.post("/api/admin/login")
def admin_login(payload: dict) -> dict:
    username = payload.get("username")
    password = payload.get("password")
    if ADMIN_CREDENTIALS.get(username) != password:
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    return {"token": "onea_admin_token", "role": "admin"}


@app.post("/api/reports")
async def create_report_endpoint(
    name: Annotated[Optional[str], Form()] = None,
    phone: Annotated[Optional[str], Form()] = None,
    problem_type: Annotated[Optional[str], Form()] = None,
    description: Annotated[Optional[str], Form()] = None,
    latitude: Annotated[Optional[float], Form()] = None,
    longitude: Annotated[Optional[float], Form()] = None,
    address: Annotated[Optional[str], Form()] = None,
    district: Annotated[Optional[str], Form()] = None,
    sector: Annotated[Optional[str], Form()] = None,
    city: Annotated[Optional[str], Form()] = None,
    audio: Annotated[Optional[UploadFile], File()] = None,
    photo: Annotated[Optional[UploadFile], File()] = None,
) -> dict:
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="latitude et longitude sont obligatoires")

    audio_path = _save_upload(audio, "audio") if audio else None
    photo_path = _save_upload(photo, "photo") if photo else None

    report = create_report(
        {
            "name": name or "Anonyme",
            "phone": phone,
            "problem_type": problem_type or "Coupure d'eau",
            "description": description or "Signalement WakatKoom",
            "message_vocal": "audio" if audio_path else None,
            "latitude": latitude,
            "longitude": longitude,
            "address": address,
            "district": district,
            "sector": sector,
            "city": city,
            "audio_path": audio_path,
            "photo_path": photo_path,
        }
    )
    report["audio_url"] = f"/uploads/audio/{report['audio_path']}" if report.get("audio_path") else None
    report["photo_url"] = f"/uploads/photo/{report['photo_path']}" if report.get("photo_path") else None
    return {"report": report, "message": "Signalement enregistré"}


@app.get("/api/reports")
def list_reports(status: Optional[str] = None, search: Optional[str] = None) -> dict:
    reports = get_reports(status=status, search=search)
    return {"reports": reports}


@app.get("/api/reports/{report_id}")
def get_report(report_id: int) -> dict:
    report = get_report_by_id(report_id)
    return {"report": report}


@app.patch("/api/reports/{report_id}/status")
def update_status(report_id: int, payload: dict, authorization: Optional[str] = Header(None)) -> dict:
    _get_admin_from_token(authorization)
    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="status est requis")
    report = update_report_status(report_id, status)
    return {"report": report}


@app.delete("/api/reports/{report_id}")
def delete_report_endpoint(report_id: int, authorization: Optional[str] = Header(None)) -> dict:
    _get_admin_from_token(authorization)
    delete_report(report_id)
    return {"message": "Signalement supprimé"}


@app.get("/api/stats")
def stats() -> dict:
    return {"stats": get_stats()}


@app.get("/uploads/{folder}/{filename}")
def serve_upload(folder: str, filename: str) -> FileResponse:
    target = UPLOAD_ROOT / folder / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return FileResponse(target)
