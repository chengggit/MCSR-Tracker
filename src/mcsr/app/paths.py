from pathlib import Path


def get_data_dir() -> Path:
    data_dir = Path.home() / ".local" / "share" / "mcsr-tracker"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_db_path() -> Path:
    return get_data_dir() / "runs.db"


def get_config_path() -> Path:
    return get_data_dir() / "config.json"


def get_log_dir() -> Path:
    log_dir = get_data_dir() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir
