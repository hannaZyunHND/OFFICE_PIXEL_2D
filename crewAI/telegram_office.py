"""Telegram channel for the chairman.

Character 1 reads a product name from the group and starts Product Hunter.
Character 2 publishes the HTML report and sends the public link back.
Character 3 receives an office panorama from the open browser and sends it as a photo.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

from env_loader import get_crew_portal_base_url, load_project_dotenv
from publish_pages import publish_product_report
from tool_registry import DEFAULT_TOOL_REGISTRY

load_project_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OFFSET_PATH = PROJECT_ROOT / "data" / "telegram_offset.txt"
CAMERA_AGENT_ID = "agent_office_camera"
_BOT_MENTION = re.compile(r"@\w+")

_bridge: Any = None
_last_photo_at = 0.0


def bind_bridge(bridge: Any) -> None:
    global _bridge
    _bridge = bridge


def bot_token() -> str:
    load_project_dotenv()
    return os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()


def chat_id() -> str:
    load_project_dotenv()
    return os.environ.get("TELEGRAM_CHAT_ID", "").strip()


def persist_env_value(key: str, value: str) -> None:
    env_path = PROJECT_ROOT / ".env"
    text = env_path.read_text(encoding="utf-8") if env_path.is_file() else ""
    line = f"{key}={value}"
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        text = pattern.sub(line, text, count=1)
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += line + "\n"
    env_path.write_text(text, encoding="utf-8")
    os.environ[key] = value


def telegram_api(method: str, payload: Optional[Dict[str, Any]] = None, timeout: int = 20) -> Any:
    token = bot_token()
    if not token:
        raise RuntimeError("Thiếu TELEGRAM_BOT_TOKEN")
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = None
    headers: Dict[str, str] = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"Telegram {method} HTTP {exc.code}: {raw}") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Telegram {method} không kết nối được: {exc.reason}") from None
    if not isinstance(body, dict) or not body.get("ok"):
        description = body.get("description") if isinstance(body, dict) else "phản hồi lạ"
        raise RuntimeError(f"Telegram {method}: {description}")
    return body.get("result")


def load_offset() -> Optional[int]:
    try:
        raw = OFFSET_PATH.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def save_offset(offset: int) -> None:
    OFFSET_PATH.parent.mkdir(parents=True, exist_ok=True)
    OFFSET_PATH.write_text(str(int(offset)), encoding="utf-8")


def iter_messages(updates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = []
    for update in updates:
        message = update.get("message") or update.get("channel_post")
        if isinstance(message, dict):
            messages.append(message)
    return messages


def pick_group_chat(updates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Prefer the most recent group or supergroup. Private chats are ignored."""
    found: Optional[Dict[str, Any]] = None
    for message in iter_messages(updates):
        chat = message.get("chat") or {}
        if chat.get("type") in {"group", "supergroup"} and chat.get("id") is not None:
            found = chat
    return found


def clean_request_text(text: str) -> str:
    cleaned = _BOT_MENTION.sub("", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:180]


def is_command(text: str) -> bool:
    return clean_request_text(text).startswith("/")


def help_text() -> str:
    return (
        "Chủ tịch nhắn tên sản phẩm vào group này.\n"
        "Ví dụ: Hộp đựng giấy gỗ cao cấp\n"
        "Văn phòng sẽ săn 3 sàn, đăng báo cáo và gửi link vào đây.\n"
        "Ảnh toàn cảnh gửi mỗi 10 giây khi máy văn phòng đang mở trang Pixel Office."
    )


def ack_text(keyword: str) -> str:
    return (
        f"Đã nhận yêu cầu: “{keyword}”.\n"
        "Văn phòng đang làm. Có link sẽ gửi vào đây. "
        "Ảnh toàn cảnh mỗi 10 giây nếu máy văn phòng đang mở."
    )


def build_delivery_message(title: str, public_url: str, warning: str = "") -> str:
    if public_url:
        return (
            f"Chủ tịch, báo cáo “{title}” đã xong.\n"
            f"Link xem trên điện thoại:\n{public_url}"
        )
    detail = warning.strip() or "Chưa đẩy được báo cáo lên host công khai."
    return f"Chủ tịch, báo cáo “{title}” đã soạn xong nhưng chưa có link công khai.\n{detail}"


def send_message(text: str, target_chat: str = "") -> bool:
    token = bot_token()
    chat = (target_chat or chat_id()).strip()
    if not token or not chat or not text.strip():
        return False
    result = telegram_api(
        "sendMessage",
        {"chat_id": chat, "text": text[:3500], "disable_web_page_preview": False},
        timeout=20,
    )
    return isinstance(result, dict)


def send_photo(jpeg: bytes, caption: str, target_chat: str = "") -> bool:
    token = bot_token()
    chat = (target_chat or chat_id()).strip()
    if not token or not chat or len(jpeg) < 32:
        return False
    boundary = "----PixelOfficeSnapshot"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="caption"\r\n\r\n{caption[:900]}\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="photo"; filename="office.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendPhoto",
        data=head + jpeg + tail,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")[:240]
        raise RuntimeError(f"Telegram sendPhoto HTTP {exc.code}: {raw}") from None
    return bool(isinstance(body, dict) and body.get("ok"))


def decode_jpeg(image_b64: str) -> bytes:
    raw = (image_b64 or "").strip()
    if raw.startswith("data:"):
        raw = raw.split(",", 1)[-1]
    if not raw:
        return b""
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception:
        return b""
    if len(data) < 32 or len(data) > 8_000_000:
        return b""
    if not data.startswith(b"\xff\xd8"):
        return b""
    return data


def _fetch_updates(offset: Optional[int], timeout: int) -> List[Dict[str, Any]]:
    payload: Dict[str, Any] = {"timeout": timeout, "limit": 20, "allowed_updates": ["message"]}
    if offset is not None:
        payload["offset"] = offset
    result = telegram_api("getUpdates", payload, timeout=timeout + 10)
    if not isinstance(result, list):
        return []
    return [item for item in result if isinstance(item, dict)]


def bootstrap_listening() -> Dict[str, Any]:
    """Find the group, drop any webhook so long-polling works, and skip old messages."""
    report: Dict[str, Any] = {
        "username": "",
        "webhook_cleared": False,
        "group_title": "",
        "group_id": "",
        "backlog": 0,
    }
    if not bot_token():
        print("[Telegram] Chưa có TELEGRAM_BOT_TOKEN, bỏ qua kênh Chủ tịch.")
        return report

    me = telegram_api("getMe")
    if isinstance(me, dict):
        report["username"] = str(me.get("username") or "")

    webhook = telegram_api("getWebhookInfo")
    webhook_url = str(webhook.get("url") or "") if isinstance(webhook, dict) else ""
    if webhook_url:
        telegram_api("deleteWebhook", {"drop_pending_updates": False})
        report["webhook_cleared"] = True
        print("[Telegram] Đã tắt webhook cũ để bot nghe tin trong group.")

    # Only the first boot drains history. Later restarts keep the saved offset
    # so a request sent while the server was down is still picked up by the poller.
    group: Optional[Dict[str, Any]] = None
    if load_offset() is None:
        updates = _fetch_updates(None, timeout=0)
        report["backlog"] = len(updates)
        group = pick_group_chat(updates)
        if group and not chat_id():
            persist_env_value("TELEGRAM_CHAT_ID", str(group.get("id")))
        if updates:
            save_offset(int(updates[-1]["update_id"]) + 1)
        elif not OFFSET_PATH.is_file():
            save_offset(0)

    active = chat_id()
    title = str((group or {}).get("title") or "")
    report["group_title"] = title
    report["group_id"] = active
    who = f"@{report['username']}" if report["username"] else "bot"
    if active:
        label = title or "group đã lưu"
        print(f"[Telegram] {who} nghe group “{label}” ({active}). Tin cũ không bị chạy lại.")
    else:
        print(
            "[Telegram] Chưa thấy group. Hãy thêm bot vào group, nhắn một câu, "
            "và tắt Privacy Mode trong BotFather nếu bot không đọc được tin thường."
        )
    return report


def _remember_group(chat: Dict[str, Any]) -> None:
    if chat.get("type") not in {"group", "supergroup"}:
        return
    incoming = str(chat.get("id") or "")
    if incoming and not chat_id():
        persist_env_value("TELEGRAM_CHAT_ID", incoming)
        title = str(chat.get("title") or incoming)
        print(f"[Telegram] Đã gắn group “{title}” ({incoming}).")


async def _start_product_hunter(bridge: Any, keyword: str) -> None:
    portal = get_crew_portal_base_url().rstrip("/")
    await bridge.trigger_flow(
        keyword,
        {
            "endpoint_url": f"{portal}/product-hunter",
            "workflow_id": "product_hunter_crewai",
            "workflow_name": "Product Hunter",
            "source": "telegram",
            "extras": {},
        },
    )


async def _handle_message(bridge: Any, message: Dict[str, Any]) -> None:
    chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
    if chat.get("type") not in {"group", "supergroup"}:
        return
    _remember_group(chat)
    configured = chat_id()
    if configured and str(chat.get("id") or "") != configured:
        return
    sender = message.get("from") if isinstance(message.get("from"), dict) else {}
    if sender.get("is_bot"):
        return
    text = clean_request_text(str(message.get("text") or ""))
    if not text:
        return
    if is_command(text):
        await asyncio.to_thread(send_message, help_text())
        return
    if bridge.is_flow_running:
        await asyncio.to_thread(
            send_message,
            "Văn phòng đang làm báo cáo khác. Chủ tịch gửi lại tên sản phẩm khi có link nhé.",
        )
        return
    await _start_product_hunter(bridge, text)


async def run_chairman_intake(bridge: Any) -> None:
    """Long-poll the chairman group. Old updates are skipped on first boot."""
    try:
        await asyncio.to_thread(bootstrap_listening)
    except Exception as exc:
        print(f"[Telegram] Không mở được kênh Chủ tịch: {exc}")
        return
    if not bot_token():
        return

    while True:
        try:
            offset = load_offset()
            updates = await asyncio.to_thread(_fetch_updates, offset, 25)
            for update in updates:
                update_id = update.get("update_id")
                if isinstance(update_id, int):
                    save_offset(update_id + 1)
                message = update.get("message")
                if isinstance(message, dict):
                    await _handle_message(bridge, message)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"[Telegram] Lỗi khi nghe group: {exc}")
            await asyncio.sleep(3)


async def handle_office_snapshot(image_b64: str, caption: str) -> None:
    global _last_photo_at
    if _bridge is not None and not _bridge.is_flow_running:
        return
    now = time.time()
    if now - _last_photo_at < 8:
        return
    jpeg = decode_jpeg(image_b64)
    if not jpeg:
        return
    _last_photo_at = now
    photo_caption = (caption or "Toàn cảnh văn phòng").strip()[:900]
    sent = False
    warning = ""
    try:
        sent = await asyncio.to_thread(send_photo, jpeg, photo_caption)
    except Exception as exc:
        warning = str(exc)
        print(f"[Telegram] Không gửi được ảnh văn phòng: {exc}")
    if _bridge is None:
        return
    status = (
        "[telegram_send_office_photo · LIVE] Đã gửi toàn cảnh văn phòng cho Chủ tịch"
        if sent
        else "[telegram_send_office_photo] Chưa gửi được ảnh văn phòng"
    )
    await _bridge.emit_event(
        event_type="AGENT_TOOL_CALL",
        agent_id=CAMERA_AGENT_ID,
        status_text=status[:160],
        icon="search",
        input_payload={"tool": "telegram_send_office_photo", "caption": photo_caption},
        output_payload={"sent": sent, "bytes": len(jpeg), "warning": warning[:180]},
        tokens_used=40,
        duration_ms=400,
    )


def _receive_request(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    text = clean_request_text(str(args.get("text") or ""))
    sent = False
    warning = ""
    if text and bot_token() and chat_id():
        try:
            sent = send_message(ack_text(text))
        except Exception as exc:
            warning = str(exc)
    return {
        "ok": True,
        "mode": "live" if sent else "sandbox",
        "provider": "telegram",
        "summary": f"Đã nhận “{text or 'yêu cầu'}” từ group" if sent else "Đã ghi nhận yêu cầu (chưa gửi được Telegram)",
        "warning": warning,
        "data": {"text": text, "chat_id": chat_id(), "sent": sent},
    }


def _deliver_report(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    html_path = Path(str(args.get("html_path") or ""))
    slug = str(args.get("slug") or "")
    title = str(args.get("title") or slug or "báo cáo")
    warning = ""
    public_url = ""
    try:
        public_url = publish_product_report(html_path, slug, title) or ""
    except Exception as exc:
        warning = str(exc)
        print(f"[Pages] Không đẩy được báo cáo lên host công khai: {exc}")
    message = build_delivery_message(title, public_url, warning)
    sent = False
    if bot_token() and chat_id():
        try:
            sent = send_message(message)
        except Exception as exc:
            warning = (warning + " " + str(exc)).strip()
            print(f"[Telegram] Không gửi được link báo cáo: {exc}")
    if public_url and sent:
        summary = "Đã đăng GitHub Pages và gửi link cho Chủ tịch"
    elif public_url:
        summary = "Đã đăng GitHub Pages, chưa gửi được Telegram"
    elif sent:
        summary = "Đã nhắn Chủ tịch, chưa có link công khai"
    else:
        summary = "Chưa đăng được báo cáo và chưa gửi được Telegram"
    return {
        "ok": True,
        "mode": "live" if (public_url or sent) else "sandbox",
        "provider": "telegram",
        "summary": summary,
        "warning": warning,
        "data": {"public_url": public_url, "sent": sent, "title": title},
        "trace": {
            "request": {"slug": slug, "title": title},
            "response": {"public_url": public_url, "sent": sent},
            "processing_steps": [
                "1. Đăng file HTML lên GitHub Pages.",
                "2. Gửi link công khai vào group Telegram của Chủ tịch.",
            ],
        },
    }


def _send_office_photo(args: Dict[str, Any], extras: Dict[str, Any]) -> Dict[str, Any]:
    jpeg = decode_jpeg(str(args.get("image_base64") or ""))
    caption = str(args.get("caption") or "Toàn cảnh văn phòng")
    sent = False
    warning = ""
    if jpeg and bot_token() and chat_id():
        try:
            sent = send_photo(jpeg, caption)
        except Exception as exc:
            warning = str(exc)
    return {
        "ok": True,
        "mode": "live" if sent else "sandbox",
        "provider": "telegram",
        "summary": "Đã gửi toàn cảnh văn phòng" if sent else "Chưa gửi được ảnh văn phòng",
        "warning": warning,
        "data": {"sent": sent, "bytes": len(jpeg)},
    }


DEFAULT_TOOL_REGISTRY.tool(
    name="telegram_receive_request",
    provider="telegram",
    description="Đọc yêu cầu sản phẩm Chủ tịch nhắn trong group Telegram và xác nhận đã nhận.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {"text": {"type": "string", "description": "Tên sản phẩm Chủ tịch vừa nhắn"}},
        "required": ["text"],
    },
    tags=["telegram", "intake"],
)(_receive_request)

DEFAULT_TOOL_REGISTRY.tool(
    name="telegram_deliver_report",
    provider="telegram",
    description="Đăng báo cáo HTML lên GitHub Pages rồi gửi link cho Chủ tịch trong Telegram.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {
            "html_path": {"type": "string"},
            "slug": {"type": "string"},
            "title": {"type": "string"},
            "local_url": {"type": "string"},
        },
        "required": ["html_path", "slug", "title"],
    },
    tags=["telegram", "github-pages"],
)(_deliver_report)

DEFAULT_TOOL_REGISTRY.tool(
    name="telegram_send_office_photo",
    provider="telegram",
    description="Gửi một ảnh toàn cảnh văn phòng vào group để Chủ tịch xem tiến độ.",
    cost_tier="free",
    parameters_schema={
        "type": "object",
        "properties": {
            "image_base64": {"type": "string"},
            "caption": {"type": "string"},
        },
        "required": ["image_base64"],
    },
    tags=["telegram", "snapshot"],
)(_send_office_photo)


def discover_report() -> int:
    try:
        report = bootstrap_listening()
    except Exception as exc:
        print(f"[Telegram] Không dò được group: {exc}")
        return 1
    print(
        json.dumps(
            {
                "username": report.get("username") or "",
                "group_title": report.get("group_title") or "",
                "group_id": report.get("group_id") or "",
                "backlog": report.get("backlog") or 0,
                "webhook_cleared": bool(report.get("webhook_cleared")),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(discover_report())
