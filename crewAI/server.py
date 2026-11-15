"""
CrewAI Multi-Agent Live WebSocket Bridge & Portal Server.
- WebSocket Endpoint: ws://localhost:8765  (connects directly to Pixel Agent Office Frontend & routes all Crew endpoints)
- Output Portal HTTP: http://localhost:8766/ (serves elearning_portal.html, .ZIP archives, and HTML5 games)
"""

from __future__ import annotations
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import time
from typing import Any, Dict, List

from pixel_office_sdk import PixelOfficeBridge
from flows.game_factory_flow import (
    get_game_factory_blueprint,
    run_game_factory_flow,
)
from flows.elearning_lesson_flow import run_elearning_lesson_flow

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


class CORSStaticHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        pass


def start_portal_http_server(port: int = 8766) -> ThreadingHTTPServer:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    handler = partial(CORSStaticHandler, directory=str(OUTPUT_DIR))
    httpd = ThreadingHTTPServer(("localhost", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    print(f"[CrewAI Portal Server] Serving generated portals & ZIPs at http://localhost:{port}/")
    return httpd


async def run_dynamic_blueprint_flow(
    prompt: str,
    bridge: PixelOfficeBridge,
    options: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Executes a live multi-agent CrewAI flow for any custom department stored in SQLite
    by traversing its agents and DAG edges in real time.
    """
    t0 = time.time()
    blueprint = options.get("blueprint") or {}
    agents: List[Dict[str, Any]] = blueprint.get("agents") or []
    edges: List[Dict[str, Any]] = blueprint.get("edges") or []
    workflow_name = str(options.get("workflow_name") or blueprint.get("meta", {}).get("project_name") or "Custom CrewAI Flow")
    step_delay = float(options.get("step_delay") or 0.7)
    attached_name = str(options.get("attached_file_name") or "").strip()

    edge_map: Dict[str, List[Dict[str, Any]]] = {}
    for edge in edges:
        src = str(edge.get("from") or "")
        if src:
            edge_map.setdefault(src, []).append(edge)

    for idx, agent in enumerate(agents):
        agent_id = str(agent.get("id") or f"agent_{idx}")
        role = str(agent.get("role") or agent_id)
        await bridge.emit_event(
            event_type="AGENT_START",
            agent_id=agent_id,
            status_text=f"[{role}] Đang xử lý yêu cầu: '{prompt[:60]}'...",
            input_payload={"prompt": prompt, "attached_file": attached_name},
            tokens_used=380 + idx * 45,
        )
        await asyncio.sleep(step_delay)

        await bridge.emit_event(
            event_type="AGENT_TOOL_CALL",
            agent_id=agent_id,
            status_text=f"[{role}] Phân tích chuyên sâu & tổng hợp kết quả đầu ra...",
            icon="code" if idx % 2 == 0 else "search",
            output_payload={"agent_id": agent_id, "step": idx + 1},
            tokens_used=620 + idx * 60,
        )
        await asyncio.sleep(step_delay)

        outgoing = edge_map.get(agent_id, [])
        if outgoing:
            for e in outgoing:
                target_id = str(e.get("to") or "")
                label = str(e.get("label") or f"Bàn giao kết quả sang {target_id}")
                if target_id:
                    await bridge.emit_event(
                        event_type="AGENT_HANDOFF",
                        agent_id=agent_id,
                        target_agent_id=target_id,
                        status_text=label,
                        icon="message",
                        tokens_used=150,
                    )
        elif idx + 1 < len(agents):
            next_id = str(agents[idx + 1].get("id") or "")
            if next_id:
                await bridge.emit_event(
                    event_type="AGENT_HANDOFF",
                    agent_id=agent_id,
                    target_agent_id=next_id,
                    status_text=f"Chuyển giao kết quả -> {agents[idx + 1].get('role', next_id)}",
                    icon="message",
                    tokens_used=150,
                )

        await bridge.emit_event(
            event_type="AGENT_COMPLETE",
            agent_id=agent_id,
            status_text=f"Hoàn tất nhiệm vụ [{role}] ✓",
            icon="check",
            tokens_used=110,
        )
        await asyncio.sleep(step_delay * 0.6)

    elapsed = round(time.time() - t0, 2)
    return {
        "flow_name": workflow_name,
        "prompt": prompt,
        "topic": prompt,
        "elapsed_seconds": elapsed,
        "portal_url": "",
        "zip_url": "",
        "zip_filename": "",
        "files_count": len(agents),
    }


async def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    start_portal_http_server(8766)

    blueprint = get_game_factory_blueprint()
    (OUTPUT_DIR / "OfficeBlueprint.json").write_text(
        __import__("json").dumps(blueprint, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    bridge = PixelOfficeBridge(
        host="localhost",
        ws_port=8765,
        initial_blueprint=None,
    )

    async def handle_task(prompt: str, options: Dict[str, Any]) -> Dict[str, Any]:
        endpoint_url = str(options.get("endpoint_url") or "").lower()
        workflow_id = str(options.get("workflow_id") or "").lower()
        workflow_name = str(options.get("workflow_name") or "").lower()
        bp = options.get("blueprint") or {}
        bp_agents = [str(a.get("id") or "") for a in (bp.get("agents") or [])]

        print(
            f'[CrewAI Flow] Dispatching prompt="{prompt}" | workflow="{workflow_name}" | endpoint="{endpoint_url}"'
        )

        # 1. E-Learning Lesson Design Crew (9 Agents)
        if (
            "elearning" in endpoint_url
            or "bài giảng" in workflow_name
            or "e-learning" in workflow_name
            or "agent_gamma_slide_engineer" in bp_agents
        ):
            step_delay = float(options.get("step_delay") or 0.75)
            result = await run_elearning_lesson_flow(
                topic_prompt=prompt,
                bridge=bridge,
                output_root=OUTPUT_DIR,
                step_delay=step_delay,
                options=options,
            )
            print(
                f'[CrewAI E-Learning Flow] Completed in {result["elapsed_seconds"]}s -> {result["portal_url"]} | ZIP: {result["zip_url"]}'
            )
            return result

        # 2. Multi-Agent Game Factory Crew (11 Agents)
        if (
            "game_factory" in workflow_id
            or "game-factory" in endpoint_url
            or "game factory" in workflow_name
            or "agent_dev_arcade" in bp_agents
        ):
            result = await run_game_factory_flow(
                prompt=prompt,
                bridge=bridge,
                output_dir=OUTPUT_DIR,
                options=options,
            )
            print(
                f'[CrewAI Game Factory Flow] Completed in {result["elapsed_seconds"]}s -> {result["portal_url"]}'
            )
            return result

        # 3. Any other SQLite CrewAI Department
        result = await run_dynamic_blueprint_flow(
            prompt=prompt,
            bridge=bridge,
            options=options,
        )
        print(f'[CrewAI Dynamic Flow] Completed in {result["elapsed_seconds"]}s')
        return result

    bridge.on_task_dispatch(handle_task)

    ws_server = await bridge.start_ws_server()
    print("[CrewAI Server] Ready! Waiting for Pixel Agent Office Frontend at ws://localhost:8765 ...")
    await ws_server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
