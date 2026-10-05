import json
from dataclasses import dataclass
from pathlib import Path

from mcsr.app.paths import get_config_path, get_pending_path


@dataclass
class Instance:
    instance_name: str
    instance_path: Path


def load_config() -> dict:
    try:
        with open(get_config_path(), encoding="utf-8") as f:
            return json.load(f)
    except OSError:
        return {"instances_dir": "", "instances": {}}


def save_config(config_data: dict) -> None:
    with open(get_config_path(), "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)


def load_pending() -> dict | None:
    try:
        with open(get_pending_path(), encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else None
    except OSError, json.JSONDecodeError:
        return None
