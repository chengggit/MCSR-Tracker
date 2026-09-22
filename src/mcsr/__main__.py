import argparse
import sqlite3
import sys
from pathlib import Path

import uvicorn

from mcsr.app.config import Instance, load_config
from mcsr.app.importer import batch_import
from mcsr.app.logger import logger
from mcsr.app.watcher import start_watcher
from mcsr.app.paths import get_db_path

DB_PATH = get_db_path()


def track(instance: Instance) -> None:
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")

    except sqlite3.Error as e:
        logger.error(f"Error connecting to SQLite database: {e}")
        sys.exit(1)

    try:
        start_watcher(instance, conn)
    finally:
        logger.info("Shutting down...")
        conn.close()


def get_instance_path(config_data: dict, inst_name: str) -> Path:
    return Path(config_data["instances"][inst_name])


def main():
    config = load_config()

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--track", type=str, help="Name of the Minecraft instance to track"
    )
    parser.add_argument("--ui", action="store_true", help="Launch the WebUI dashboard")

    parser.add_argument(
        "--import-world",
        type=str,
        help="Import world folders from an instance to the database",
    )

    parser.add_argument("world_dirs", nargs="*", help="World directories to import")

    args = parser.parse_args()

    if args.import_world:
        try:
            conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            conn.execute("PRAGMA journal_mode = WAL")

            batch_import(args.world_dirs, args.import_world, conn)
            conn.close()
            return

        except sqlite3.Error as e:
            logger.error(f"Error connecting to SQLite database: {e}")
            sys.exit(1)

    if not args.track and not args.ui and not args.import_world:
        print(
            "Error: Please specify --track <instance>, --ui, or both. Or to import worlds from an instance, use --import-world <instance> <world_dirs>"
        )
        sys.exit(1)

    # dashboard only
    if args.ui and not args.track:
        print("Launching Dashboard on http://127.0.0.1:8000")
        uvicorn.run("app.api:app")
        return

    instance = Instance(str(args.track), get_instance_path(config, str(args.track)))
    # track only
    if args.track and not args.ui:
        print(f"Background tracking {args.track}")
        track(instance)
        return

    else:
        print(f"Tracking {args.track} and Launching Dashboard on http://127.0.0.1:8000")
        track(instance)
        uvicorn.run("mcsr.app.api:app")
        return


if __name__ == "__main__":
    main()
