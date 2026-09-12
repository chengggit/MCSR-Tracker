from pathlib import Path
from typing import TYPE_CHECKING

from app.logger import logger
from app.record import filter_record, has_enabled_cheat, read_record, save_to_db

if TYPE_CHECKING:
    from sqlite3 import Connection


# Import one world, no play.log or atum check
def import_world(full_world_dir: Path, instance_name: str, conn: Connection) -> dict:
    record_path = full_world_dir / "speedrunigt" / "record.json"
    events_path = full_world_dir / "speedrunigt" / "events.log"

    if not record_path.exists():
        return {
            "world_name": full_world_dir.name,
            "success": False,
            "error": "record.json not found",
        }

    raw_record = read_record(record_path)
    if raw_record is None:
        return {
            "world_name": full_world_dir.name,
            "success": False,
            "error": "Failed to parse record.json",
        }

    cheat_status = has_enabled_cheat(events_path)
    if cheat_status is None:
        return {
            "world_name": full_world_dir.name,
            "success": False,
            "error": "Cheat status is unknown",
        }

    filtered_record = filter_record(raw_record, instance_name, cheat_status["igt"])

    with conn:
        save_to_db(filtered_record, conn)

    return {
        "world_name": full_world_dir.name,
        "success": True,
    }


def batch_import(
    world_dirs: list[Path | str], instance_name: str, conn: Connection
) -> list[dict]:
    results = []
    for world_dir in world_dirs:
        result = import_world(Path(world_dir), instance_name, conn)
        results.append(result)
        logger.info(
            f'Importing "{result["world_name"]}": {result.get("error", "Success")}.'
        )
    return results
