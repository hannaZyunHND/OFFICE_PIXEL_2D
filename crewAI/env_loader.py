"""Zero-dependency `.env` loader & runtime endpoint helpers for CrewAI Backend."""

from __future__ import annotations

import os
from pathlib import Path


def load_project_dotenv(override: bool = False) -> Path | None:
    """
    Loads key=value pairs from `<repo_root>/.env` into `os.environ`.
    Does not overwrite pre-existing environment variables unless `override=True`.
    """
    candidates = [
        Path(__file__).resolve().parents[1] / ".env",
        Path.cwd() / ".env",
    ]
    env_path = next((p for p in candidates if p.is_file()), None)
    if not env_path:
        return None

    for raw_line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        clean_key = key.strip()
        clean_val = val.strip().strip('"').strip("'")
        if not clean_key:
            continue
        if override or not os.environ.get(clean_key):
            os.environ[clean_key] = clean_val
    return env_path


def get_crew_host() -> str:
    load_project_dotenv()
    return os.environ.get("CREWAI_HOST", "").strip() or "localhost"


def get_crew_port() -> int:
    load_project_dotenv()
    raw = (
        os.environ.get("CREWAI_PORT")
        or os.environ.get("VITE_CREWAI_PORT")
        or "34214"
    ).strip()
    try:
        port = int(raw)
        return port if 1 <= port <= 65535 else 34214
    except ValueError:
        return 34214


def get_crew_portal_base_url() -> str:
    load_project_dotenv()
    explicit = os.environ.get("VITE_CREWAI_HTTP_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    return f"http://{get_crew_host()}:{get_crew_port()}"
