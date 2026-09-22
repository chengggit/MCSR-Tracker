import logging
from datetime import date

from mcsr.app.paths import get_log_dir


def setup_logger():
    log_path = get_log_dir() / f"{date.today().isoformat()}.log"

    logger = logging.getLogger("mcsr")
    logger.setLevel(logging.DEBUG)

    if logger.hasHandlers():
        return logger

    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s")

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    console.setLevel(logging.INFO)
    logger.addHandler(console)

    file_handler = logging.FileHandler(log_path, encoding="utf-8", mode="a")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


logger = setup_logger()
