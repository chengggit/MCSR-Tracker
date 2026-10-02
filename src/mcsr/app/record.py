import gzip
import json
import sqlite3
import time
from pathlib import Path

from pynbt import NBTFile

from mcsr.app.logger import logger

# keys to extract from record.json
KEYS_TO_EXTRACT = [
    "mc_version",
    "category",
    "run_type",
    "is_completed",
    "world_name",
    "date",
    "retimed_igt",
    "final_igt",
    "final_rta",
]
# splits to extract from timelines[]
TIMELINE_NAMES = {
    "enter_nether",
    "enter_bastion",
    "enter_fortress",
    "nether_travel",
    "enter_stronghold",
    "enter_end",
    "kill_ender_dragon",
}


def is_atum_world(log_path: Path) -> bool:
    timeout = 10
    deadline = time.monotonic() + timeout
    last_error = "Timed out"

    while time.monotonic() < deadline:
        try:
            if not log_path.exists() or log_path.stat().st_size == 0:
                last_error = "File is missing or 0 bytes"
                time.sleep(0.05)
                continue

            with open(log_path, encoding="utf-8") as f:
                first_line = f.readline().strip()

            if not first_line:
                last_error = "First line is empty"
                time.sleep(0.05)
                continue

            data = json.loads(first_line)
            if data:
                return data["data"]["atum_running"]

            last_error = "Couldn't get Atum status"
            time.sleep(0.05)
            continue

        except (json.JSONDecodeError, OSError, KeyError, TypeError) as e:
            last_error = e

        time.sleep(0.05)

    logger.error(f"Error reading play.log: {last_error}")
    return False


def read_record(record_path: Path) -> dict | None:
    timeout = 10
    deadline = time.monotonic() + timeout
    last_error = None

    while time.monotonic() < deadline:
        try:
            if not record_path.exists() or record_path.stat().st_size == 0:
                time.sleep(0.05)
                continue

            with open(record_path, encoding="utf-8") as f:
                data = json.load(f)

            if data:
                return data

            last_error = "File is empty"
            time.sleep(0.05)
            continue

        except (json.JSONDecodeError, OSError) as e:
            last_error = e
        time.sleep(0.05)

    logger.error(f"Skipping {record_path.parents[1].name}: {last_error}")
    return None


def has_enabled_cheat(events_path: Path) -> dict | None:
    timeout = 3
    deadline = time.monotonic() + timeout
    last_error = None

    while time.monotonic() < deadline:
        try:
            with open(events_path, encoding="utf-8") as f:
                for line in f:
                    if "common.enable_cheats" in line:
                        parts = line.split()

                        return {
                            "is_enabled": True,
                            "igt": int(parts[2]),
                        }

                return {"is_enabled": False, "igt": None}

        except (OSError, ValueError, IndexError) as e:
            last_error = e

        time.sleep(0.05)

    logger.error(f"Error reading {events_path}: {last_error}")
    return None


# Only reads seed if /seed was run
def read_seed(path: Path) -> int | None:
    try:
        with gzip.open(path, "rb") as f:
            nbt = NBTFile(f)
            seed = int(nbt["Data"]["WorldGenSettings"]["seed"].value)
            return seed
    except OSError:
        logger.debug("Cannot read NBT file. File is encrypted.")
        return


def filter_record(raw_record: dict, cheat_igt: int | None) -> dict:
    filtered_record = {key: raw_record[key] for key in KEYS_TO_EXTRACT}

    filtered_record["timelines"] = [
        timeline
        for timeline in raw_record["timelines"]
        if timeline["name"] in TIMELINE_NAMES and (cheat_igt is None or timeline["igt"] < cheat_igt)
    ]

    return filtered_record


def save_to_db(filtered_record: dict, conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO runs (instance, world_name, run_type, category,
                    final_igt, final_rta, retimed_igt,
                    date, is_completed, mc_version, seed)

                    VALUES (:instance, :world_name, :run_type, :category,
                    :final_igt, :final_rta, :retimed_igt,
                    :date, :is_completed, :mc_version, :seed)

                    ON CONFLICT (instance, world_name) DO UPDATE SET
                    final_igt = EXCLUDED.final_igt,
                    final_rta = EXCLUDED.final_rta,
                    retimed_igt = EXCLUDED.retimed_igt,
                    is_completed = EXCLUDED.is_completed,
                    seed = COALESCE(EXCLUDED.seed, runs.seed)""",
        filtered_record,
    )

    cursor.execute(
        "SELECT id FROM runs WHERE instance = ? and world_name = ?",
        (
            filtered_record["instance"],
            filtered_record["world_name"],
        ),
    )

    run_id = cursor.fetchone()[0]
    cursor.execute("DELETE FROM timelines WHERE run_id = ?", (run_id,))

    records = [(run_id, t["name"], t["igt"], t["rta"]) for t in filtered_record["timelines"]]
    cursor.executemany(
        """INSERT INTO timelines (run_id, name, igt, rta) VALUES (?, ?, ?, ?)""",
        records,
    )


# full_world_dir: "instance_path/world_name"
def process_run(full_world_dir: Path, instance_name: str, conn: sqlite3.Connection) -> None:
    nbt_path = full_world_dir / "level.dat"
    log_path = full_world_dir / "hermes" / "play.log"
    record_path = full_world_dir / "speedrunigt" / "record.json"
    events_path = full_world_dir / "speedrunigt" / "events.log"

    if not is_atum_world(log_path):
        logger.info(f"Skipping {full_world_dir.name}: Not created by Atum")
        return

    cheat_status = has_enabled_cheat(events_path)

    if cheat_status is None:
        logger.info(f"Skipping {full_world_dir.name}: Cheat status is unknown")
        return

    raw_record = read_record(record_path)
    if raw_record is None:
        return

    filtered_record = filter_record(raw_record, cheat_status["igt"])
    filtered_record["instance"] = instance_name
    filtered_record["seed"] = read_seed(nbt_path)

    with conn:
        save_to_db(filtered_record, conn)

    logger.info(f"Saved {full_world_dir.name}")
