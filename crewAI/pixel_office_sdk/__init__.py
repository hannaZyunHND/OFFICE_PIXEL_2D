"""
Pixel Agent Office — Python SDK for CrewAI & Multi-Agent Frameworks.
Provides standardized data contracts, deterministic auto-layout blueprint generation,
and real-time WebSocket event streaming + task dispatching.
"""

from .contracts import (
    AgentSpec,
    EdgeSpec,
    ZoneSpec,
    build_office_blueprint,
    create_agent_event,
)
from .bridge import PixelOfficeBridge

__all__ = [
    "AgentSpec",
    "EdgeSpec",
    "ZoneSpec",
    "build_office_blueprint",
    "create_agent_event",
    "PixelOfficeBridge",
]
