"""
PixelOfficeBridge — Bidirectional WebSocket Bridge & Relay between CrewAI Flows and Pixel Agent Office.
- Streams real-time AgentEvents (AGENT_START, AGENT_TOOL_CALL, AGENT_HANDOFF, AGENT_COMPLETE, AGENT_ERROR)
- Syncs OfficeBlueprint.json when explicitly requested via set_blueprint() (BLUEPRINT_SYNC)
- Supports both Server Mode (listening on the configured CrewAI port, default ws://localhost:34214) and automatic Relay Client Mode
  if another PixelOfficeBridge server is already listening on that port.
"""

from __future__ import annotations
import asyncio
import json
import mimetypes
from pathlib import Path
import urllib.parse
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set
import websockets
from websockets.asyncio.client import connect as ws_connect
from websockets.asyncio.server import ServerConnection
from websockets.datastructures import Headers
from websockets.http11 import Response
from .contracts import EventType, ToolIconType, create_agent_event

TaskHandler = Callable[[str, Dict[str, Any]], Awaitable[Dict[str, Any]]]


class _RelayServerHandle:
    """Dummy server handle returned when PixelOfficeBridge runs in client-relay mode."""

    def __init__(self, relay_ws: Any) -> None:
        self._relay_ws = relay_ws

    async def wait_closed(self) -> None:
        if self._relay_ws:
            await self._relay_ws.wait_closed()


class PixelOfficeBridge:
    def __init__(
        self,
        host: str = "localhost",
        ws_port: int = 34214,
        initial_blueprint: Optional[Dict[str, Any]] = None,
        static_output_dir: Optional[Path] = None,
    ) -> None:
        self.host = host
        self.ws_port = ws_port
        self.active_blueprint: Optional[Dict[str, Any]] = initial_blueprint
        self.static_output_dir: Optional[Path] = (
            Path(static_output_dir).resolve() if static_output_dir else None
        )
        self.latest_flow_result: Optional[Dict[str, Any]] = None
        self.is_flow_running: bool = False
        self.clients: Set[ServerConnection] = set()
        self.event_history: List[Dict[str, Any]] = []
        self._task_handler: Optional[TaskHandler] = None
        self._running_task: Optional[asyncio.Task[Any]] = None
        self._relay_client_ws: Optional[Any] = None
        self._pending_approvals: Dict[str, asyncio.Future[Dict[str, Any]]] = {}
        self._tool_metadata_list: List[Dict[str, Any]] = []

    def set_tool_metadata(self, tools: List[Dict[str, Any]]) -> None:
        """Registers external tool schemas so connected frontends can inspect available functions."""
        self._tool_metadata_list = list(tools)

    async def broadcast_tool_registry(self) -> None:
        if not self._tool_metadata_list:
            return
        await self.broadcast_json(
            {
                "type": "TOOL_REGISTRY_SYNC",
                "tools": self._tool_metadata_list,
            }
        )

    async def request_human_approval(
        self,
        agent_id: str,
        step_title: str,
        summary_md: str,
        stage: str = "APPROVAL",
        choices: Optional[List[Dict[str, Any]]] = None,
        multi_select: bool = True,
        form_fields: Optional[List[Dict[str, Any]]] = None,
        context_payload: Optional[Dict[str, Any]] = None,
        estimated_cost_usd: float = 0.0,
        timeout_sec: float = 600.0,
        approval_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Pauses the active async Flow and requests Human-in-the-Loop input/approval from the UI.
        Resolves as soon as the frontend returns a matching `HUMAN_APPROVAL_RESPONSE`.
        """
        loop = asyncio.get_running_loop()
        req_id = approval_id or f"hitl_{int(loop.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        fut: asyncio.Future[Dict[str, Any]] = loop.create_future()
        self._pending_approvals[req_id] = fut

        approval_payload = {
            "approval_id": req_id,
            "agent_id": agent_id,
            "step_title": step_title,
            "stage": stage,
            "summary_md": summary_md,
            "choices": choices or [],
            "multi_select": multi_select,
            "form_fields": form_fields or [],
            "context_payload": context_payload or {},
            "estimated_cost_usd": estimated_cost_usd,
        }
        await self.broadcast_json(
            {
                "type": "HUMAN_APPROVAL_REQUIRED",
                "approval": approval_payload,
            }
        )

        try:
            return await asyncio.wait_for(fut, timeout=timeout_sec)
        except asyncio.TimeoutError:
            return {
                "approval_id": req_id,
                "decision": "timeout",
                "selected_choices": [],
                "inputs": {},
                "note": "HITL approval timed out; proceeding with defaults.",
            }
        finally:
            self._pending_approvals.pop(req_id, None)

    def resolve_human_approval(
        self, approval_id: str, response: Dict[str, Any]
    ) -> bool:
        """Resolves a pending HITL Future when user response arrives over WebSocket or tests."""
        fut = self._pending_approvals.get(approval_id)
        if fut is not None and not fut.done():
            fut.set_result(response)
            return True
        return False

    def cancel_pending_approvals(self, reason: str = "flow_cancelled") -> None:
        for req_id, fut in list(self._pending_approvals.items()):
            if not fut.done():
                fut.set_result(
                    {
                        "approval_id": req_id,
                        "decision": "reject",
                        "selected_choices": [],
                        "inputs": {},
                        "note": reason,
                    }
                )
        self._pending_approvals.clear()

    def on_task_dispatch(self, handler: TaskHandler) -> None:
        """Registers the async CrewAI Flow callback triggered when a prompt is dispatched."""
        self._task_handler = handler

    async def set_blueprint(self, blueprint: Dict[str, Any]) -> None:
        """Updates the active OfficeBlueprint and broadcasts BLUEPRINT_SYNC to all connected browsers."""
        self.active_blueprint = blueprint
        await self.broadcast_json(
            {
                "type": "BLUEPRINT_SYNC",
                "blueprint": blueprint,
            }
        )

    async def broadcast_json(self, payload: Dict[str, Any]) -> None:
        raw = json.dumps(payload, ensure_ascii=False)
        # If running in Relay Client Mode, send to the primary bridge server
        if self._relay_client_ws is not None:
            try:
                await self._relay_client_ws.send(raw)
            except Exception as err:
                print(f"[PixelOfficeBridge] Relay send error: {err}")
            return

        if not self.clients:
            return
        stale: List[ServerConnection] = []
        for ws in list(self.clients):
            try:
                await ws.send(raw)
            except Exception:
                stale.append(ws)
        for s in stale:
            self.clients.discard(s)

    async def emit_event(
        self,
        event_type: EventType,
        agent_id: str,
        status_text: str,
        target_agent_id: Optional[str] = None,
        icon: Optional[ToolIconType] = None,
        input_payload: Optional[Any] = None,
        output_payload: Optional[Any] = None,
        tokens_used: int = 250,
        duration_ms: int = 1200,
    ) -> Dict[str, Any]:
        evt = create_agent_event(
            event_type=event_type,
            agent_id=agent_id,
            status_text=status_text,
            target_agent_id=target_agent_id,
            icon=icon,
            input_payload=input_payload,
            output_payload=output_payload,
            tokens_used=tokens_used,
            duration_ms=duration_ms,
        )
        self.event_history.append(evt)
        if len(self.event_history) > 200:
            self.event_history = self.event_history[-200:]
        await self.broadcast_json(evt)
        return evt

    async def publish_flow_result(self, result: Dict[str, Any]) -> None:
        self.latest_flow_result = result
        self.is_flow_running = False
        await self.broadcast_json(
            {
                "type": "FLOW_RESULT",
                "result": result,
            }
        )

    async def _handle_client(self, websocket: ServerConnection) -> None:
        self.clients.add(websocket)
        print(f"[PixelOfficeBridge] Client connected ({len(self.clients)} active)")
        try:
            if self.active_blueprint:
                await websocket.send(
                    json.dumps(
                        {
                            "type": "BLUEPRINT_SYNC",
                            "blueprint": self.active_blueprint,
                        },
                        ensure_ascii=False,
                    )
                )
            if self._tool_metadata_list:
                await websocket.send(
                    json.dumps(
                        {
                            "type": "TOOL_REGISTRY_SYNC",
                            "tools": self._tool_metadata_list,
                        },
                        ensure_ascii=False,
                    )
                )

            async for message in websocket:
                try:
                    data = json.loads(message)
                except Exception:
                    continue

                if not isinstance(data, dict):
                    continue

                # Relay external CrewAI producer AgentEvents to all browser clients
                if "event_type" in data and "agent_id" in data:
                    self.event_history.append(data)
                    if len(self.event_history) > 200:
                        self.event_history = self.event_history[-200:]
                    await self.broadcast_json(data)
                    continue

                msg_type = data.get("type")
                if msg_type == "BLUEPRINT_SYNC" and isinstance(data.get("blueprint"), dict):
                    self.active_blueprint = data["blueprint"]
                    await self.broadcast_json(data)
                elif msg_type == "DISPATCH_TASK":
                    prompt = str(
                        data.get("prompt") or "Dạy phân số lớp 4 - Cắt bánh"
                    ).strip()
                    options = data.get("options") or {}
                    await self.trigger_flow(prompt, options)
                elif msg_type == "HUMAN_APPROVAL_RESPONSE":
                    resp = data.get("response") if isinstance(data.get("response"), dict) else data
                    approval_id = str(resp.get("approval_id") or "")
                    if approval_id:
                        self.resolve_human_approval(approval_id, dict(resp))
                elif msg_type == "REQUEST_BLUEPRINT" and self.active_blueprint:
                    await websocket.send(
                        json.dumps(
                            {
                                "type": "BLUEPRINT_SYNC",
                                "blueprint": self.active_blueprint,
                            },
                            ensure_ascii=False,
                        )
                    )
        except Exception as err:
            print(f"[PixelOfficeBridge] Connection closed: {err}")
        finally:
            self.clients.discard(websocket)

    async def trigger_flow(
        self, prompt: str, options: Optional[Dict[str, Any]] = None
    ) -> None:
        if not self._task_handler:
            return
        if self._running_task and not self._running_task.done():
            self.cancel_pending_approvals("new_flow_started")
            self._running_task.cancel()

        self.is_flow_running = True
        self.latest_flow_result = None
        await self.broadcast_json(
            {
                "type": "FLOW_STARTED",
                "prompt": prompt,
            }
        )

        async def _runner() -> None:
            try:
                res = await self._task_handler(prompt, options or {})
                await self.publish_flow_result(res)
            except asyncio.CancelledError:
                self.is_flow_running = False
            except Exception as exc:
                self.is_flow_running = False
                await self.broadcast_json(
                    {
                        "type": "FLOW_ERROR",
                        "error": str(exc),
                    }
                )

        self._running_task = asyncio.create_task(_runner())

    def _process_http_request(self, _connection: Any, request: Any) -> Optional[Response]:
        """
        Serves generated CrewAI HTTP artifacts (HTML dashboards, ZIPs, SVGs) on the exact
        same TCP port as the WebSocket server when receiving regular HTTP requests.
        """
        if self.static_output_dir is None:
            return None
        upgrade = ""
        try:
            upgrade = str(request.headers.get("Upgrade", "")).lower()
        except Exception:
            upgrade = ""
        if "websocket" in upgrade:
            return None

        raw_path = str(getattr(request, "path", "/") or "/").split("?", 1)[0]
        rel_path = urllib.parse.unquote(raw_path).lstrip("/")
        if not rel_path:
            rel_path = "portal.html"

        target = (self.static_output_dir / rel_path).resolve()
        if not target.is_relative_to(self.static_output_dir):
            return Response(
                403,
                "Forbidden",
                Headers([("Content-Type", "text/plain; charset=utf-8")]),
                b"Forbidden",
            )
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            return Response(
                404,
                "Not Found",
                Headers([("Content-Type", "text/plain; charset=utf-8"), ("Access-Control-Allow-Origin", "*")]),
                b"Artifact not found",
            )

        mime, _ = mimetypes.guess_type(str(target))
        content_type = mime or "application/octet-stream"
        if content_type.startswith("text/") or content_type in ("application/json", "image/svg+xml"):
            content_type = f"{content_type}; charset=utf-8"

        headers = Headers(
            [
                ("Content-Type", content_type),
                ("Access-Control-Allow-Origin", "*"),
                ("Cache-Control", "no-store"),
            ]
        )
        return Response(200, "OK", headers, target.read_bytes())

    async def start_ws_server(self) -> Any:
        try:
            server = await websockets.serve(
                self._handle_client,
                self.host,
                self.ws_port,
                process_request=self._process_http_request if self.static_output_dir else None,
            )
            print(
                f"[PixelOfficeBridge] Dual WebSocket & HTTP Server listening at ws://{self.host}:{self.ws_port} / http://{self.host}:{self.ws_port}/"
            )
            return server
        except OSError:
            # Port is already bound by an active PixelOfficeBridge hub — connect as a relay publisher!
            uri = f"ws://{self.host}:{self.ws_port}"
            self._relay_client_ws = await ws_connect(uri)
            print(
                f"[PixelOfficeBridge] Connected in Relay Publisher Mode to active hub at {uri}"
            )
            if self.active_blueprint:
                await self.set_blueprint(self.active_blueprint)
            return _RelayServerHandle(self._relay_client_ws)
