"""
Template chuẩn hóa để tích hợp BẤT KỲ CrewAI / CrewAI Flow mới nào vào Pixel Agent Office.
Chỉ cần định nghĩa danh sách AgentSpec, EdgeSpec và hàm async run_custom_crew_flow().
"""

from __future__ import annotations
import asyncio
from pathlib import Path
from typing import Any, Dict
from env_loader import get_crew_portal_base_url
from pixel_office_sdk import (
    AgentSpec,
    EdgeSpec,
    PixelOfficeBridge,
    build_office_blueprint,
)


def get_custom_crew_blueprint() -> Dict[str, Any]:
    agents = [
        AgentSpec(
            id="agent_planner",
            name="Planner Agent",
            role="Phân tích yêu cầu & Lập kế hoạch",
            zone_id="zone_work",
            color="#38bdf8",
            avatar_sprite="default_scientist",
        ),
        AgentSpec(
            id="agent_coder",
            name="Coder Agent",
            role="Thực thi code & Tích hợp công cụ",
            zone_id="zone_work",
            color="#22c55e",
            avatar_sprite="default_coder",
        ),
        AgentSpec(
            id="agent_reviewer",
            name="QA Reviewer",
            role="Kiểm thử & Phê duyệt kết quả",
            zone_id="zone_approval",
            color="#eab308",
            avatar_sprite="default_reviewer",
        ),
    ]

    edges = [
        EdgeSpec("agent_planner", "agent_coder", "Execution Plan"),
        EdgeSpec("agent_coder", "agent_reviewer", "Build Artifact"),
    ]

    return build_office_blueprint(
        project_name="CUSTOM CREWAI WORKFLOW",
        agents=agents,
        edges=edges,
    )


async def run_custom_crew_flow(
    prompt: str,
    bridge: PixelOfficeBridge,
    output_dir: Path,
    options: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    await bridge.emit_event(
        "AGENT_START",
        "agent_planner",
        f'Đang lập kế hoạch cho yêu cầu: "{prompt}"...',
        input_payload={"prompt": prompt},
        tokens_used=350,
    )
    await asyncio.sleep(1.2)

    await bridge.emit_event(
        "AGENT_HANDOFF",
        "agent_planner",
        "Chuyển kế hoạch thực thi sang Coder Agent...",
        target_agent_id="agent_coder",
        icon="message",
        tokens_used=180,
    )
    await bridge.emit_event(
        "AGENT_COMPLETE",
        "agent_planner",
        "Hoàn tất kế hoạch ✓",
        icon="check",
        tokens_used=90,
    )
    await asyncio.sleep(1.0)

    await bridge.emit_event(
        "AGENT_TOOL_CALL",
        "agent_coder",
        "Đang chạy công cụ sinh kết quả...",
        icon="code",
        tokens_used=640,
    )
    await asyncio.sleep(1.2)

    await bridge.emit_event(
        "AGENT_HANDOFF",
        "agent_coder",
        "Gửi sản phẩm sang QA Reviewer...",
        target_agent_id="agent_reviewer",
        icon="message",
        tokens_used=200,
    )
    await bridge.emit_event(
        "AGENT_COMPLETE",
        "agent_coder",
        "Đã bàn giao sản phẩm ✓",
        icon="check",
        tokens_used=100,
    )
    await asyncio.sleep(1.0)

    await bridge.emit_event(
        "AGENT_COMPLETE",
        "agent_reviewer",
        "Kiểm duyệt đạt chuẩn 100% ✓",
        icon="check",
        tokens_used=250,
    )

    return {
        "flow_name": "CUSTOM CREWAI WORKFLOW",
        "prompt": prompt,
        "elapsed_seconds": 3.4,
        "portal_url": f"{get_crew_portal_base_url()}/portal.html",
        "streams": [],
        "master_blueprint": {"prompt": prompt, "status": "APPROVED"},
        "qr_svg": "",
    }
