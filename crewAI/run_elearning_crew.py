"""
Runner thực thi trực tiếp CrewAI Flow 'Thiết Kế Bài Giảng Điện Tử' (9 Agents)
và truyền sự kiện thời gian thực sang Pixel Agent Office qua ws://localhost:8765.

Cách chạy:
  python crewAI/run_elearning_crew.py "Các vùng kinh tế biển Việt Nam"
"""

from __future__ import annotations
import asyncio
from pathlib import Path
import sys

from pixel_office_sdk import PixelOfficeBridge
from flows.elearning_lesson_flow import run_elearning_lesson_flow

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


async def main() -> None:
    topic = (
        " ".join(sys.argv[1:]).strip()
        if len(sys.argv) > 1
        else "Các vùng kinh tế biển Việt Nam"
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    bridge = PixelOfficeBridge(host="localhost", ws_port=8765)
    handle = await bridge.start_ws_server()

    print(f"======================================================================")
    print(f"[E-Learning CrewAI] Bắt đầu chạy quy trình cho chủ đề: '{topic}'")
    print(f"[E-Learning CrewAI] Kết nối Pixel Agent Office: ws://localhost:8765/elearning-crew")
    print(f"======================================================================")

    await bridge.broadcast_json(
        {
            "type": "FLOW_STARTED",
            "prompt": f"Thiết kế bài giảng điện tử: {topic}",
        }
    )

    result = await run_elearning_lesson_flow(
        topic_prompt=topic,
        bridge=bridge,
        output_root=OUTPUT_DIR,
        step_delay=0.95,
    )

    await bridge.publish_flow_result(result)
    print(f"======================================================================")
    print(f"[E-Learning CrewAI] HOÀN TẤT TRONG {result['elapsed_seconds']}s!")
    print(f"  -> Thư mục học liệu : {result['package_dir']}")
    print(f"  -> File nén .ZIP    : {result['zip_path']}")
    print(f"  -> Website Portal   : {result['portal_url']}")
    print(f"======================================================================")


if __name__ == "__main__":
    asyncio.run(main())
