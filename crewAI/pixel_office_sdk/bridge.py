"""
PixelOfficeBridge — Bidirectional WebSocket Bridge & Relay between CrewAI Flows and Pixel Agent Office.
- Streams real-time AgentEvents (AGENT_START, AGENT_TOOL_CALL, AGENT_HANDOFF, AGENT_COMPLETE, AGENT_ERROR)
- Syncs OfficeBlueprint.json when explicitly requested via set_blueprint() (BLUEPRINT_SYNC)
- Supports both Server Mode (listening on ws://localhost:8765) and automatic Relay Client Mode
  if another PixelOfficeBridge server is already listening on port 8765.
"""

from __future__ import annotations
import asyncio
import json
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set
import websockets
from websockets.asyncio.client import connect as ws_connect
from websockets.asyncio.server import ServerConnection
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
        ws_port: int = 8765,
        initial_blueprint: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.host = host
        self.ws_port = ws_port
        self.active_blueprint: Optional[Dict[str, Any]] = initial_blueprint
        self.latest_flow_result: Optional[Dict[str, Any]] = None
        self.is_flow_running: bool = False
        self.clients: Set[ServerConnection] = set()
        self.event_history: List[Dict[str, Any]] = []
        self._task_handler: Optional[TaskHandler] = None
        self._running_task: Optional[asyncio.Task[Any]] = None
        self._relay_client_ws: Optional[Any] = None

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
        # If running in Relay Client Mode, send to the hub server on ws://localhost:8765
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

    async def start_ws_server(self) -> Any:
        try:
            server = await websockets.serve(self._handle_client, self.host, self.ws_port)
            print(
                f"[PixelOfficeBridge] WebSocket Server listening at ws://{self.host}:{self.ws_port}"
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
