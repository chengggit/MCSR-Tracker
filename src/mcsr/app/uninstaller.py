import os
import shutil
import subprocess
import sys
from pathlib import Path

import questionary

from mcsr.app.paths import mcsr_home

BOLD = "\033[1m"
RESET = "\033[0m"
CYAN = "\033[36m"
GRAY = "\033[90m"

def windows_uninstaller(target: bool = True) -> None:
    system_python = Path(sys.base_prefix) / "python.exe"

    # dont indent this string
    cleanup_code = f"""
import shutil
from pathlib import Path

shutil.rmtree(Path(r"{target}"))
print(f"\\n{CYAN}MCSR Tracker uninstalled.{RESET}")
"""

    subprocess.Popen(
        [str(system_python), "-c", cleanup_code],
    )

def uninstaller() -> None:
    """Uninstall MCSR Tracker"""
    danger_style = questionary.Style(
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
    mcsr_bin = Path.home() / ".local" / "bin" / "mcsr"

    keep_data = questionary.confirm(
        "Keep your data?",
        style=danger_style,
    ).ask()

    if not keep_data:
        if not questionary.confirm(
            "This will PERMANENTLY DELETE your run database, configuration, and logs. Are you sure?",
            style=danger_style,
        ).ask():
            print(f"{GRAY}Uninstallation cancelled.{RESET}")
            return

    target = venv_dir if keep_data else mcsr_home_dir

    if os.name == "nt":
        windows_uninstaller(target)
        return

    shutil.rmtree(target)
    mcsr_bin.unlink(missing_ok=True)

    print(f"{CYAN}MCSR Tracker uninstalled.{RESET}")
