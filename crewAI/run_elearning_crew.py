"""
Runner thực thi trực tiếp CrewAI Flow 'Thiết Kế Bài Giảng Điện Tử' (9 Agents)
và truyền sự kiện thời gian thực sang Pixel Agent Office qua CrewAI port trong .env (mặc định 34214).

Cách chạy:
  python crewAI/run_elearning_crew.py "Các vùng kinh tế biển Việt Nam"
"""

from __future__ import annotations
import asyncio
from pathlib import Path
import sys

from env_loader import get_crew_host, get_crew_port, load_project_dotenv
from pixel_office_sdk import PixelOfficeBridge
from flows.elearning_lesson_flow import run_elearning_lesson_flow

OUTPUT_DIR = Path(__file__).resolve().parent / "output"


async def main() -> None:
    load_project_dotenv(override=False)
    crew_host = get_crew_host()
    crew_port = get_crew_port()
    topic = (
        " ".join(sys.argv[1:]).strip()
        if len(sys.argv) > 1
        else "Các vùng kinh tế biển Việt Nam"
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    bridge = PixelOfficeBridge(host=crew_host, ws_port=crew_port, static_output_dir=OUTPUT_DIR)
    handle = await bridge.start_ws_server()

    print(f"======================================================================")
    print(f"[E-Learning CrewAI] Bắt đầu chạy quy trình cho chủ đề: '{topic}'")
    print(f"[E-Learning CrewAI] Kết nối Pixel Agent Office: ws://{crew_host}:{crew_port}/elearning-crew")
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
