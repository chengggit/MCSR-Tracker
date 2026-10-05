import sqlite3
import sys

import click
import uvicorn

from mcsr.app.config import Instance, load_config
from mcsr.app.importer import batch_import
from mcsr.app.logger import logger
from mcsr.app.paths import get_db_path, get_instance_path
from mcsr.app.setup_mcsr import setup
from mcsr.app.uninstaller import uninstaller
from mcsr.app.updater import updater
from mcsr.app.watcher import start_tracker

DB_PATH = get_db_path()


@click.group()
def main():
    pass


@main.command("dashboard")
def launch_dashboard() -> None:
    """Launch the WebUI Dashboard"""

    print("Launching Dashboard on http://127.0.0.1:8000")
    uvicorn.run("mcsr.app.api:app")
    return


@main.command("track")
@click.argument("instance_name", nargs=1)
@click.option("--dashboard", is_flag=True, help="Launch the WebUI dashboard")
def track(instance_name: str, dashboard: bool) -> None:
    """Start tracking an instance"""

    config = load_config()
    instance = Instance(instance_name, get_instance_path(config, instance_name))
    print(f"Tracking {instance_name}")

    if dashboard:
        launch_dashboard()

    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")

    except sqlite3.Error as e:
        logger.error(f"Error connecting to SQLite database: {e}")
        sys.exit(1)

    try:
        start_tracker(instance, conn)
    finally:
        logger.info("Shutting down...")
        conn.close()


@main.command("import")
@click.argument("instance_name")
@click.argument("world_directories", nargs=-1, required=True)
def import_world(instance_name: str, world_directories: tuple[str]) -> None:
    """Import WORLDS to INSTANCE"""
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode = WAL")

        batch_import(list(world_directories), instance_name, conn)
        conn.close()
        return

    except sqlite3.Error as e:
        logger.error(f"Error connecting to SQLite database: {e}")
        sys.exit(1)


@main.command("setup")
def setup_command() -> None:
    """Setup MCSR Tracker"""
    setup()


@main.command("update")
def update_command() -> None:
    """Check for and install the latest version of MCSR Tracker"""
    updater()


@main.command("reinstall")
def reinstall_command() -> None:
    """Reinstall MCSR Tracker"""
    updater(True)


@main.command("uninstall")
def uninstall_command() -> None:
    """Uninstall MCSR Tracker"""
    uninstaller()


if __name__ == "__main__":
    main()
