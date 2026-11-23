"""Publish a self-contained Product Hunter HTML report to GitHub Pages.

Uses the git credentials already stored for github.com. Each report becomes
https://<user>.github.io/<repo>/<slug>/ so a boss can open it without localhost.
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from env_loader import load_project_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPO_NAME = "pixel-office-reports"
_SLUG_RE = re.compile(r"^[a-z0-9_]{1,64}$")


def publish_enabled() -> bool:
    load_project_dotenv()
    flag = os.environ.get("REPORT_PUBLISH", "auto").strip().lower()
    return flag not in {"0", "off", "false", "no"}


def pages_site_url(owner: str, repo: str, slug: str = "") -> str:
    base = f"https://{owner.lower()}.github.io/{repo.strip('/')}"
    if slug:
        return f"{base}/{slug}/"
    return f"{base}/"


def render_catalog(entries: list[tuple[str, str]]) -> str:
    items = []
    for slug, title in entries:
        safe_slug = html.escape(slug, quote=True)
        safe_title = html.escape(title)
        items.append(f'      <li><a href="./{safe_slug}/">{safe_title}</a></li>')
    body = "\n".join(items) or "      <li>Chưa có báo cáo.</li>"
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Báo cáo Product Hunter</title>
  <style>
    body {{ margin: 0; font-family: system-ui, sans-serif; background: #020617; color: #e2e8f0; }}
    main {{ max-width: 720px; margin: 0 auto; padding: 32px 20px; }}
    h1 {{ font-size: 24px; margin: 0 0 8px; }}
    p {{ color: #94a3b8; }}
    a {{ color: #38bdf8; }}
    li {{ margin: 10px 0; }}
  </style>
</head>
<body>
  <main>
    <h1>Báo cáo Product Hunter</h1>
    <p>Mở một báo cáo bên dưới. Trang này là bản công khai để xem trên điện thoại hoặc máy sếp.</p>
    <ul>
{body}
    </ul>
  </main>
</body>
</html>
"""


def publish_product_report(html_path: Path, slug: str, title: str) -> str:
    """Upload one report and return its public Pages URL. Empty string if disabled."""
    if not publish_enabled():
        return ""
    if not _SLUG_RE.match(slug):
        raise RuntimeError(f"Slug báo cáo không hợp lệ: {slug}")
    html_path = Path(html_path)
    if not html_path.is_file():
        raise RuntimeError(f"Không thấy file báo cáo: {html_path}")

    token = _github_token()
    user = _api(token, "GET", "/user")
    login = str(user.get("login") or "").strip()
    if not login:
        raise RuntimeError("GitHub không trả về tên tài khoản.")

    owner, repo, branch = _ensure_repo(token, login)
    remote = f"https://github.com/{owner}/{repo}.git"
    with tempfile.TemporaryDirectory(prefix="pixel-pages-") as tmp:
        work = Path(tmp) / "site"
        _checkout(remote, branch, work)
        target = work / slug
        target.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(html_path, target / "index.html")
        (work / ".nojekyll").write_text("", encoding="utf-8")
        entries = _catalog_entries(work)
        # Prefer the title from this run over a stale <title> parse.
        entries = [(s, title if s == slug and title else t) for s, t in entries]
        (work / "index.html").write_text(render_catalog(entries), encoding="utf-8")
        _commit_and_push(work, branch, f"Publish {slug}")

    _ensure_pages(token, owner, repo, branch)
    url = pages_site_url(owner, repo, slug)
    wait_until_live(url)
    return url


def wait_until_live(url: str, attempts: int = 24, pause: float = 2.5) -> bool:
    """Pages trả 404 trong lúc build. Chỉ coi là xong khi URL đã mở được."""
    for attempt in range(max(1, attempts)):
        if _url_is_live(url):
            return True
        if attempt + 1 < attempts:
            time.sleep(pause)
    print(f"[Pages] Đã đẩy file nhưng site chưa build xong: {url}")
    return False


def _url_is_live(url: str) -> bool:
    request = urllib.request.Request(
        url,
        method="GET",
        headers={"User-Agent": "pixel-office-pages", "Cache-Control": "no-cache"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return int(getattr(response, "status", 200) or 200) == 200
    except urllib.error.HTTPError as exc:
        return exc.code == 200
    except Exception:
        return False


def _catalog_entries(work: Path) -> list[tuple[str, str]]:
    found: list[tuple[float, str, str]] = []
    for child in work.iterdir():
        page = child / "index.html"
        if not child.is_dir() or not page.is_file():
            continue
        if not _SLUG_RE.match(child.name):
            continue
        title = _title_of(page) or child.name
        found.append((page.stat().st_mtime, child.name, title))
    found.sort(key=lambda row: row[0], reverse=True)
    return [(slug, title) for _mtime, slug, title in found]


def _title_of(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"<title>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    raw = re.sub(r"\s+", " ", match.group(1)).strip()
    return html.unescape(raw)


def _ensure_repo(token: str, login: str) -> tuple[str, str, str]:
    explicit = os.environ.get("REPORT_GITHUB_REPO", "").strip()
    if explicit:
        owner, repo = _split_repo(explicit)
        info = _api(token, "GET", f"/repos/{owner}/{repo}")
        if info.get("private"):
            raise RuntimeError(
                f"{owner}/{repo} đang để riêng tư, sếp sẽ không mở được. Hãy để repo public."
            )
        branch = str(info.get("default_branch") or "main")
        return owner, repo, branch

    info = _api_allowing(
        token,
        "GET",
        f"/repos/{login}/{DEFAULT_REPO_NAME}",
        allowed={404},
    )
    if info is None:
        info = _api(
            token,
            "POST",
            "/user/repos",
            {
                "name": DEFAULT_REPO_NAME,
                "description": "Báo cáo HTML Product Hunter",
                "private": False,
                "auto_init": True,
            },
        )
    if info.get("private"):
        raise RuntimeError(
            f"{login}/{DEFAULT_REPO_NAME} đang để riêng tư, sếp sẽ không mở được."
        )
    owner = str((info.get("owner") or {}).get("login") or login)
    repo = str(info.get("name") or DEFAULT_REPO_NAME)
    branch = str(info.get("default_branch") or "main")
    return owner, repo, branch


def _ensure_pages(token: str, owner: str, repo: str, branch: str) -> None:
    current = _api_allowing(token, "GET", f"/repos/{owner}/{repo}/pages", allowed={404})
    source = {"branch": branch, "path": "/"}
    if current is None:
        _api(token, "POST", f"/repos/{owner}/{repo}/pages", {"source": source})
        return
    existing = (current.get("source") or {})
    if existing.get("branch") == branch and existing.get("path") in {"/", "/docs", None}:
        return
    _api(token, "PUT", f"/repos/{owner}/{repo}/pages", {"source": source})


def _checkout(remote: str, branch: str, work: Path) -> None:
    cloned = _run(
        ["git", "clone", "--depth", "1", "--branch", branch, remote, str(work)],
        cwd=PROJECT_ROOT,
        check=False,
    )
    if cloned.returncode == 0:
        return
    work.mkdir(parents=True, exist_ok=True)
    _run(["git", "init", "-b", branch], cwd=work)
    _run(["git", "remote", "add", "origin", remote], cwd=work)


def _commit_and_push(work: Path, branch: str, message: str) -> None:
    name, email = _git_identity()
    _run(["git", "add", "-A"], cwd=work)
    dirty = _run(["git", "status", "--porcelain"], cwd=work)
    if not dirty.stdout.strip():
        return
    _run(
        [
            "git",
            "-c",
            f"user.name={name}",
            "-c",
            f"user.email={email}",
            "commit",
            "-m",
            message,
        ],
        cwd=work,
    )
    _run(["git", "push", "-u", "origin", f"HEAD:{branch}"], cwd=work)


def _git_identity() -> tuple[str, str]:
    name = _git_config("user.name") or "Pixel Office"
    email = _git_config("user.email") or "pixel-office@users.noreply.github.com"
    return name, email


def _git_config(key: str) -> str:
    proc = _run(["git", "config", "--get", key], cwd=PROJECT_ROOT, check=False)
    return proc.stdout.strip()


def _split_repo(value: str) -> tuple[str, str]:
    clean = value.strip().strip("/")
    if clean.startswith("https://github.com/"):
        clean = clean.removeprefix("https://github.com/")
    if clean.endswith(".git"):
        clean = clean[:-4]
    parts = [p for p in clean.split("/") if p]
    if len(parts) != 2:
        raise RuntimeError("REPORT_GITHUB_REPO phải có dạng owner/repo.")
    return parts[0], parts[1]


def _github_token() -> str:
    proc = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
            if token:
                return token
    raise RuntimeError("Git chưa lưu đăng nhập GitHub, nên chưa đẩy báo cáo lên được.")


def _api(token: str, method: str, path: str, body: dict | None = None) -> dict:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        "https://api.github.com" + path,
        data=payload,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "pixel-office-pages",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"GitHub API {method} {path} lỗi {exc.code}: {detail}") from None
    if not raw.strip():
        return {}
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, dict) else {}


def _api_allowing(token: str, method: str, path: str, allowed: set[int]) -> dict | None:
    try:
        return _api(token, method, path)
    except RuntimeError as exc:
        message = str(exc)
        if any(f"lỗi {code}" in message for code in allowed):
            return None
        raise


def _run(args: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    proc = subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
        env=env,
    )
    if check and proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "git failed").strip()
        raise RuntimeError(detail[-500:])
    return proc


if __name__ == "__main__":
    import sys

    page = Path(sys.argv[1])
    report_slug = sys.argv[2]
    report_title = sys.argv[3] if len(sys.argv) > 3 else report_slug
    print(publish_product_report(page, report_slug, report_title))
