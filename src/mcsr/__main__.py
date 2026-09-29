import shutil
import sqlite3
import sys
from pathlib import Path

import click
import questionary
import uvicorn
from questionary import Style

from mcsr.app.config import Instance, load_config
from mcsr.app.importer import batch_import
from mcsr.app.logger import logger
from mcsr.app.paths import get_db_path, mcsr_home
from mcsr.app.setup_mcsr import setup
from mcsr.app.updater import updater
from mcsr.app.watcher import start_watcher

DB_PATH = get_db_path()
BOLD = "\033[1m"
RESET = "\033[0m"
CYAN = "\033[36m"
GRAY = "\033[90m"


def get_instance_path(config_data: dict, instance_name: str) -> Path:
    return Path(config_data["instances"][instance_name])


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
        start_watcher(instance, conn)
    finally:
        logger.info("Shutting down...")
        conn.close()


@main.command("import")
@click.argument("instance_name")
@click.argument("world_directory", nargs=-1)
def import_world(instance_name: str, world_directory: tuple[str]) -> None:
    """Import WORLD to INSTANCE"""
    try:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode = WAL")

        batch_import(list(world_directory), instance_name, conn)
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
def reinstall() -> None:
    """Reinstall MCSR Tracker"""
    updater(True)


@main.command("uninstall")
def uninstall() -> None:
    """Uninstall MCSR Tracker"""
    danger_style = Style(
        [
            ("question", "fg:red bold"),
            ("qmark", "fg:red bold"),
            ("instruction", "fg:red bold"),
            ("answer", "fg:red bold"),
        ]
    )

    if not questionary.confirm(
        "Uninstall MCSR Tracker?",
        style=danger_style,
    ).ask():
        return

    mcsr_home_dir = mcsr_home()
    venv_dir = mcsr_home_dir / "venv"
    bin_path = Path.home() / ".local" / "bin" / "mcsr"

    keep_data = questionary.confirm(
        "Keep your data?",
        style=danger_style,
    ).ask()

    if keep_data:
        shutil.rmtree(venv_dir)
        bin_path.unlink(missing_ok=True)
    else:
        if not questionary.confirm(
            "This will PERMANENTLY DELETE your run database, configuration, and logs. Are you sure?",
            style=danger_style,
        ).ask():
            print(f"{GRAY}Uninstallation cancelled.{RESET}")
            return

        shutil.rmtree(mcsr_home_dir)
        bin_path.unlink(missing_ok=True)

    print(f"{CYAN}MCSR Tracker uninstalled.{RESET}")


if __name__ == "__main__":
    main()
