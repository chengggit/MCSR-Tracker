import sys
from pathlib import Path


def mcsr_home() -> Path:
    mcsr_home_dir = Path(sys.executable).parent.parent.parent
    return mcsr_home_dir


def get_db_path() -> Path:
    return mcsr_home() / "runs.db"


def get_config_path() -> Path:
    return mcsr_home() / "config.json"


def get_log_dir() -> Path:
    log_dir = mcsr_home() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_pending_path() -> Path:
    return mcsr_home() / "pending.json"


def get_instance_path(config_data: dict, instance_name: str) -> Path:
    return Path(config_data["instances"][instance_name])
