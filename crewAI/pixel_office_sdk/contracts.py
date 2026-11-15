"""
Standardized Data Contracts between CrewAI (Python) and Pixel Agent Office (Frontend).
Conforms 100% to:
- specs/001-pixel-agent-office/contracts/office-blueprint.schema.json
- specs/001-pixel-agent-office/contracts/realtime-event.schema.json
"""

from __future__ import annotations
import math
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Literal, Optional

ZoneType = Literal["WORK", "APPROVAL", "IDLE"]
EventType = Literal[
    "AGENT_START",
    "AGENT_TOOL_CALL",
    "AGENT_HANDOFF",
    "AGENT_COMPLETE",
    "AGENT_ERROR",
]
ToolIconType = Literal["search", "code", "db", "error", "message", "check"]
AvatarPreset = str


@dataclass
class ZoneSpec:
    id: str
    name: str
    type: ZoneType


@dataclass
class AgentSpec:
    id: str
    name: str
    role: str
    zone_id: str = "zone_work"
    color: str = "#38bdf8"
    avatar_sprite: AvatarPreset = "default_scientist"


@dataclass
class EdgeSpec:
    from_agent: str
    to_agent: str
    label: str


def build_office_blueprint(
    project_name: str,
    agents: List[AgentSpec],
    edges: List[EdgeSpec],
    zones: Optional[List[ZoneSpec]] = None,
) -> Dict[str, Any]:
    """
    Deterministic Auto-Layout Engine (Python Adapter):
    Converts any CrewAI agent roster & workflow edges into a valid OfficeBlueprint.json
    with guaranteed >= 1 tile walkable clearance around every desk and prop.
    """
    if not zones:
        zones = [
            ZoneSpec(id="zone_work", name="Khu Thực Thi CrewAI", type="WORK"),
            ZoneSpec(id="zone_approval", name="Phòng QA & Kiểm Duyệt", type="APPROVAL"),
            ZoneSpec(id="zone_pantry", name="Pantry & Lounge", type="IDLE"),
        ]

    zone_by_id = {z.id: z for z in zones}
    work_agents = [
        a for a in agents if zone_by_id.get(a.zone_id, ZoneSpec("", "", "WORK")).type == "WORK"
    ]
    approval_agents = [
        a for a in agents if zone_by_id.get(a.zone_id, ZoneSpec("", "", "WORK")).type == "APPROVAL"
    ]

    work_cols_per_row = min(3, max(2, math.ceil(math.sqrt(max(1, len(work_agents))))))
    work_desk_rows = max(1, math.ceil(len(work_agents) / work_cols_per_row))

    work_zone_width = max(15, work_cols_per_row * 5 + 3)
    right_col_width = 7
    grid_cols = min(48, max(24, 1 + work_zone_width + 1 + right_col_width + 1))

    work_zone_height = max(14, work_desk_rows * 4 + 5)
    approval_rows = max(1, len(approval_agents))
    approval_height = max(6, approval_rows * 3 + 3)
    idle_height = 8
    grid_rows = min(36, max(16, max(work_zone_height + 2, approval_height + idle_height + 3)))

    work_zone_meta = next((z for z in zones if z.type == "WORK"), zones[0])
    approval_zone_meta = next(
        (z for z in zones if z.type == "APPROVAL"),
        ZoneSpec("zone_approval", "Phòng Kiểm Duyệt", "APPROVAL"),
    )
    idle_zone_meta = next(
        (z for z in zones if z.type == "IDLE"),
        ZoneSpec("zone_pantry", "Pantry & Lounge", "IDLE"),
    )

    right_x = 2 + work_zone_width
    zone_dicts = [
        {
            "id": work_zone_meta.id,
            "name": work_zone_meta.name,
            "type": "WORK",
            "rect": [1, 1, work_zone_width, grid_rows - 2],
        },
        {
            "id": approval_zone_meta.id,
            "name": approval_zone_meta.name,
            "type": "APPROVAL",
            "rect": [right_x, 1, right_col_width, approval_height],
        },
        {
            "id": idle_zone_meta.id,
            "name": idle_zone_meta.name,
            "type": "IDLE",
            "rect": [right_x, approval_height + 2, right_col_width, grid_rows - approval_height - 3],
        },
    ]

    furniture: List[Dict[str, Any]] = []
    agent_dicts: List[Dict[str, Any]] = []

    for idx, ag in enumerate(work_agents):
        col_idx = idx % work_cols_per_row
        row_idx = idx // work_cols_per_row
        desk_x = 3 + col_idx * 5
        desk_y = 4 + row_idx * 4
        desk_id = f"furn_desk_{ag.id}"

        furniture.append(
            {
                "id": desk_id,
                "type": "DESK_PC",
                "x": desk_x,
                "y": desk_y,
                "footprint": [2, 1],
                "interaction_point": [desk_x, desk_y + 1],
                "facing": "UP",
                "agent_id": ag.id,
            }
        )
        agent_dicts.append(
            {
                "id": ag.id,
                "name": ag.name,
                "role": ag.role,
                "color": ag.color,
                "avatar_sprite": ag.avatar_sprite,
                "desk_id": desk_id,
            }
        )

    for idx, ag in enumerate(approval_agents):
        desk_x = right_x + 2
        desk_y = 3 + idx * 3
        desk_id = f"furn_desk_{ag.id}"

        furniture.append(
            {
                "id": desk_id,
                "type": "DESK_PC",
                "x": desk_x,
                "y": desk_y,
                "footprint": [2, 1],
                "interaction_point": [desk_x, desk_y + 1],
                "facing": "UP",
                "agent_id": ag.id,
            }
        )
        agent_dicts.append(
            {
                "id": ag.id,
                "name": ag.name,
                "role": ag.role,
                "color": ag.color,
                "avatar_sprite": ag.avatar_sprite,
                "desk_id": desk_id,
            }
        )

    furniture.extend(
        [
            {
                "id": "furn_bookshelf_auto",
                "type": "BOOKSHELF",
                "x": 2,
                "y": 2,
                "footprint": [2, 1],
                "interaction_point": [2, 3],
                "facing": "UP",
            },
            {
                "id": "furn_whiteboard_auto",
                "type": "WHITEBOARD",
                "x": min(work_zone_width - 2, 12),
                "y": 2,
                "footprint": [2, 1],
                "interaction_point": [min(work_zone_width - 2, 12), 3],
                "facing": "UP",
            },
        ]
    )

    idle_top_y = approval_height + 3
    sofa_y = min(grid_rows - 3, idle_top_y + 4)
    furniture.extend(
        [
            {
                "id": "furn_coffee_auto",
                "type": "COFFEE_MACHINE",
                "x": right_x + 1,
                "y": idle_top_y,
                "footprint": [1, 1],
                "interaction_point": [right_x + 1, idle_top_y + 1],
                "facing": "UP",
            },
            {
                "id": "furn_aquarium_auto",
                "type": "AQUARIUM",
                "x": right_x + 4,
                "y": idle_top_y,
                "footprint": [2, 1],
                "interaction_point": [right_x + 4, idle_top_y + 1],
                "facing": "UP",
            },
            {
                "id": "furn_sofa_auto",
                "type": "SOFA",
                "x": right_x + 2,
                "y": sofa_y,
                "footprint": [2, 1],
                "interaction_point": [right_x + 2, sofa_y - 1],
                "facing": "DOWN",
            },
        ]
    )

    return {
        "meta": {
            "project_name": project_name,
            "grid_cols": grid_cols,
            "grid_rows": grid_rows,
            "tile_size": 32,
        },
        "zones": zone_dicts,
        "furniture": furniture,
        "agents": agent_dicts,
        "edges": [
            {"from": e.from_agent, "to": e.to_agent, "label": e.label} for e in edges
        ],
    }


def create_agent_event(
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
    """
    Creates a standardized Real-Time Event Protocol dictionary ready to broadcast over WebSocket.
    """
    metadata: Dict[str, Any] = {
        "status_text": status_text,
        "tokens_used": tokens_used,
        "duration_ms": duration_ms,
    }
    if icon:
        metadata["icon"] = icon
    if input_payload is not None:
        metadata["input_payload"] = input_payload
    if output_payload is not None:
        metadata["output_payload"] = output_payload

    evt: Dict[str, Any] = {
        "event_id": f"evt_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
        "timestamp": int(time.time() * 1000),
        "event_type": event_type,
        "agent_id": agent_id,
        "metadata": metadata,
    }
    if target_agent_id:
        evt["target_agent_id"] = target_agent_id
    return evt
