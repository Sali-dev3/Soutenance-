import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

DB_PATH = os.environ.get("WAKATKOOM_DB_PATH", str(Path(__file__).resolve().parent / "data" / "wakatkoom.db"))
UPLOAD_ROOT = Path(os.environ.get("WAKATKOOM_UPLOAD_DIR", str(Path(__file__).resolve().parent / "uploads")))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_number TEXT NOT NULL UNIQUE,
            name TEXT,
            phone TEXT,
            problem_type TEXT,
            description TEXT,
            message_vocal TEXT,
            latitude REAL,
            longitude REAL,
            address TEXT,
            district TEXT,
            sector TEXT,
            city TEXT,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Nouveau',
            photo_path TEXT,
            audio_path TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row)


def create_report(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    tracking_number = data.get("tracking_number") or f"WK-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    created_at = datetime.utcnow().isoformat()
    cursor = conn.execute(
        """
        INSERT INTO reports (
            tracking_number, name, phone, problem_type, description, message_vocal,
            latitude, longitude, address, district, sector, city,
            created_at, status, photo_path, audio_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            tracking_number,
            data.get("name"),
            data.get("phone"),
            data.get("problem_type"),
            data.get("description"),
            data.get("message_vocal"),
            data.get("latitude"),
            data.get("longitude"),
            data.get("address"),
            data.get("district"),
            data.get("sector"),
            data.get("city"),
            created_at,
            data.get("status") or "Nouveau",
            data.get("photo_path"),
            data.get("audio_path"),
        ),
    )
    conn.commit()
    report_id = cursor.lastrowid
    report = get_report_by_id(report_id)
    conn.close()
    return report


def get_reports(status: Optional[str] = None, search: Optional[str] = None) -> list[Dict[str, Any]]:
    conn = get_db_connection()
    query = "SELECT * FROM reports"
    params: list[Any] = []
    filters = []
    if status:
        filters.append("status = ?")
        params.append(status)
    if search:
        filters.append("(address LIKE ? OR district LIKE ? OR sector LIKE ? OR city LIKE ? OR description LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like, like, like, like])
    if filters:
        query += " WHERE " + " AND ".join(filters)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def get_report_by_id(report_id: int) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    if not row:
        raise KeyError("report_not_found")
    return _row_to_dict(row)


def update_report_status(report_id: int, status: str) -> Dict[str, Any]:
    conn = get_db_connection()
    conn.execute("UPDATE reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    report = get_report_by_id(report_id)
    conn.close()
    return report


def delete_report(report_id: int) -> None:
    conn = get_db_connection()
    conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    conn.commit()
    conn.close()


def get_stats() -> Dict[str, Any]:
    conn = get_db_connection()
    total = conn.execute("SELECT COUNT(*) AS total FROM reports").fetchone()[0]
    nouveau = conn.execute("SELECT COUNT(*) AS total FROM reports WHERE status = 'Nouveau'").fetchone()[0]
    en_cours = conn.execute("SELECT COUNT(*) AS total FROM reports WHERE status = 'En cours'").fetchone()[0]
    resolu = conn.execute("SELECT COUNT(*) AS total FROM reports WHERE status = 'Résolu'").fetchone()[0]
    conn.close()
    return {"total": total, "nouveau": nouveau, "en_cours": en_cours, "resolu": resolu}
