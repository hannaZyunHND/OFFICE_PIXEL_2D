"""
CLI Test Runner for Multi-Agent Game Factory (CrewAI Flows).
Runs the entire 3-Phase flow once with fast step_delay (0.15s) to verify all outputs:
- crewAI/output/OfficeBlueprint.json
- crewAI/output/master_blueprint_3_gdds.json
- crewAI/output/stream1_arcade.html
- crewAI/output/stream2_sim.html
- crewAI/output/stream3_puzzle.html
- crewAI/output/portal.html
- crewAI/output/classroom_qr.svg
- crewAI/output/flow_result.json
"""

from __future__ import annotations
import asyncio
import json
from pathlib import Path
from pixel_office_sdk import PixelOfficeBridge
from flows.game_factory_flow import (
    get_game_factory_blueprint,
    run_game_factory_flow,
)


async def main() -> None:
    out_dir = Path(__file__).resolve().parent / "output"
    blueprint = get_game_factory_blueprint()
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "OfficeBlueprint.json").write_text(
        json.dumps(blueprint, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    bridge = PixelOfficeBridge(initial_blueprint=blueprint)
    print("=== RUNNING CREWAI MULTI-AGENT GAME FACTORY FLOW ===")
    result = await run_game_factory_flow(
        prompt="Dạy phân số lớp 4 - Cắt bánh",
        bridge=bridge,
        output_dir=out_dir,
        options={"step_delay": 0.08},
    )
    print(f"Total Events Emitted: {len(bridge.event_history)}")
    print(f"Portal Generated:     {out_dir / 'portal.html'}")
    print(f"Streams Passed:       {len(result['streams'])} / 3")
    for s in result["streams"]:
        print(f"  - {s['name']}: Score {s['score']}/10 ({s['verdict']}) -> {s['file']}")


if __name__ == "__main__":
    asyncio.run(main())
