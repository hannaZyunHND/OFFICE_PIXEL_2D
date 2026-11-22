"""
External Function Calling Registry for Pixel Agent Office CrewAI Flows.
Allows CrewAI flows to declare external tools/APIs with explicit JSON parameter schemas,
quota/cost tiers, live/sandbox execution telemetry, and real-time AgentEvent streaming.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import time
from typing import Any, Callable, Dict, List, Literal, Optional


CostTier = Literal["free", "credit", "paid"]


@dataclass
class ExternalToolSpec:
    name: str
    provider: str
    description: str
    cost_tier: CostTier
    estimated_cost_usd: float
    requires_hitl: bool
    parameters_schema: Dict[str, Any]
    handler: Callable[..., Dict[str, Any]]
    tags: List[str] = field(default_factory=list)

    def to_public_metadata(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "provider": self.provider,
            "description": self.description,
            "cost_tier": self.cost_tier,
            "estimated_cost_usd": self.estimated_cost_usd,
            "requires_hitl": self.requires_hitl,
            "parameters_schema": self.parameters_schema,
            "tags": self.tags,
        }


class ToolRegistry:
    """Central registry for registering and invoking external API functions safely."""

    def __init__(self) -> None:
        self._tools: Dict[str, ExternalToolSpec] = {}

    def register(self, spec: ExternalToolSpec) -> ExternalToolSpec:
        self._tools[spec.name] = spec
        return spec

    def tool(
        self,
        *,
        name: str,
        provider: str,
        description: str,
        cost_tier: CostTier = "free",
        estimated_cost_usd: float = 0.0,
        requires_hitl: bool = False,
        parameters_schema: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
    ) -> Callable[[Callable[..., Dict[str, Any]]], Callable[..., Dict[str, Any]]]:
        def decorator(fn: Callable[..., Dict[str, Any]]) -> Callable[..., Dict[str, Any]]:
            self.register(
                ExternalToolSpec(
                    name=name,
                    provider=provider,
                    description=description,
                    cost_tier=cost_tier,
                    estimated_cost_usd=estimated_cost_usd,
                    requires_hitl=requires_hitl,
                    parameters_schema=parameters_schema or {"type": "object", "properties": {}},
                    handler=fn,
                    tags=tags or [],
                )
            )
            return fn

        return decorator

    def get(self, name: str) -> Optional[ExternalToolSpec]:
        return self._tools.get(name)

    def list_tools_metadata(self) -> List[Dict[str, Any]]:
        return [spec.to_public_metadata() for spec in self._tools.values()]

    async def invoke(
        self,
        tool_name: str,
        args: Dict[str, Any],
        extras: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        spec = self._tools.get(tool_name)
        if spec is None:
            return {
                "ok": False,
                "mode": "error",
                "provider": "unknown",
                "tool_name": tool_name,
                "duration_ms": 0,
                "estimated_cost_usd": 0.0,
                "error": f"Tool '{tool_name}' is not registered in ToolRegistry",
                "data": None,
            }

        t0 = time.perf_counter()
        try:
            if asyncio.iscoroutinefunction(spec.handler):
                result = await spec.handler(args=args, extras=extras or {})
            else:
                result = await asyncio.to_thread(spec.handler, args=args, extras=extras or {})
            elapsed_ms = max(1, int((time.perf_counter() - t0) * 1000))

            mode = str(result.get("mode") or "sandbox")
            return {
                "ok": bool(result.get("ok", True)),
                "mode": mode,
                "provider": str(result.get("provider") or spec.provider),
                "tool_name": spec.name,
                "duration_ms": elapsed_ms,
                "estimated_cost_usd": spec.estimated_cost_usd if mode == "live" else 0.0,
                "summary": str(result.get("summary") or f"{spec.name} completed ({mode})"),
                "warning": str(result.get("warning") or ""),
                "data": result.get("data", result),
                "trace": result.get("trace"),
            }
        except Exception as exc:
            elapsed_ms = max(1, int((time.perf_counter() - t0) * 1000))
            return {
                "ok": False,
                "mode": "error",
                "provider": spec.provider,
                "tool_name": spec.name,
                "duration_ms": elapsed_ms,
                "estimated_cost_usd": 0.0,
                "summary": f"{spec.name} failed: {exc}",
                "error": str(exc),
                "data": None,
            }


DEFAULT_TOOL_REGISTRY = ToolRegistry()


async def execute_tool_for_agent(
    bridge: Any,
    agent_id: str,
    tool_name: str,
    args: Dict[str, Any],
    extras: Optional[Dict[str, Any]] = None,
    *,
    registry: ToolRegistry = DEFAULT_TOOL_REGISTRY,
    status_prefix: Optional[str] = None,
    icon: str = "search",
    tokens_used: int = 340,
) -> Dict[str, Any]:
    """
    Executes a registered external tool in a non-blocking thread/coroutine
    and emits a structured `AGENT_TOOL_CALL` event with both inputs and output preview.
    """
    result = await registry.invoke(tool_name, args, extras=extras)
    mode_tag = "LIVE" if result.get("mode") == "live" else "SANDBOX"
    status = status_prefix or f"[{tool_name} · {mode_tag}] {result.get('summary', '')}"

    data = result.get("data")
    preview: Any = data
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        preview = {
            **{k: v for k, v in data.items() if k != "items"},
            "items_count": len(data["items"]),
            "top_items_sample": data["items"][:3],
        }

    if bridge is not None:
        await bridge.emit_event(
            event_type="AGENT_TOOL_CALL",
            agent_id=agent_id,
            status_text=status[:160],
            icon=icon,
            input_payload={
                "external_function": tool_name,
                "args": args,
                "provider": result.get("provider"),
            },
            output_payload={
                "ok": result.get("ok"),
                "mode": result.get("mode"),
                "duration_ms": result.get("duration_ms"),
                "estimated_cost_usd": result.get("estimated_cost_usd"),
                "warning": result.get("warning"),
                "result": preview,
            },
            tokens_used=tokens_used,
            duration_ms=max(600, int(result.get("duration_ms") or 800)),
        )

    return result
