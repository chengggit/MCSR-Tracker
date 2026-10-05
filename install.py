#!/usr/bin/env python3

import hashlib
import json
import os
import subprocess
import sys
import venv
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MIN_PYTHON = (3, 14)
API_URL = "https://api.github.com/repos/chengggit/MCSR-Tracker/releases/latest"

# ANSI escape sequences for terminal styling
BOLD = "\033[1m"
RESET = "\033[0m"
GREEN = "\033[32m"
CYAN = "\033[36m"
RED = "\033[31m"
GRAY = "\033[90m"

# window
if os.name == "nt":
    DEFAULT_INSTALL_DIR = Path(os.environ["LOCALAPPDATA"]) / "mcsr-tracker"
else:  # linux
    xdg_data_home = os.environ.get("XDG_DATA_HOME", "~/.local/share")
    DEFAULT_INSTALL_DIR = Path(xdg_data_home).expanduser() / "mcsr-tracker"


def check_python_version() -> None:
    if sys.version_info < MIN_PYTHON:
        current = ".".join(map(str, sys.version_info[:3]))
        required = ".".join(map(str, MIN_PYTHON))

        print(f"{RED}Error: Python {required}+ is required.{RESET}")
        print(f"Found Python {current}.")
        sys.exit(1)


# API request to get the latest release files and version
def get_latest_release() -> tuple[str, dict, dict]:
    req = Request(API_URL)
    try:
        with urlopen(req) as res:
            raw_data = res.read().decode("utf-8")

            data = json.loads(raw_data)
            assets = data["assets"]

            whl_file = next(asset for asset in assets if asset["name"].endswith(".whl"))

            checksum_file = next(asset for asset in assets if asset["name"] == "checksums.sha256")
        return data["tag_name"], whl_file, checksum_file

    except HTTPError as e:
        print(f"{RED}HTTP Error: {e.code} - {e.reason}{RESET}")
        sys.exit(1)
    except URLError as e:
        print(f"{RED}URL Error: {e.reason}{RESET}")
        sys.exit(1)


def download_file(url: str, destination: Path) -> None:
    with urlopen(url) as res:
        destination.write_bytes(res.read())


def verify_checksum(checksum_path: Path, whl_path: Path) -> bool:
    # Checksum from GitHub
    checksum_data = checksum_path.read_text()

    for line in checksum_data.splitlines():
        checksum, filename = line.split(maxsplit=1)

        if Path(filename).name == whl_path.name:
            # Calculate the checksum of the downloaded whl file
            actual_checksum = hashlib.sha256(whl_path.read_bytes()).hexdigest()
            return actual_checksum == checksum

    return False


def create_venv(venv_dir: Path) -> None:
    if not venv_dir.exists():
        venv.create(venv_dir, with_pip=True)


# Create a symlink for the "mcsr" command so it can be run from anywhere in the system
def create_symlink(link_target: Path) -> None:
    bin_dir = Path.home() / ".local" / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)

    mcsr_link = bin_dir / "mcsr"

    if mcsr_link.exists() or mcsr_link.is_symlink():
        if mcsr_link.is_symlink() and mcsr_link.resolve() == link_target.resolve():
            print(f"\n{GRAY}MCSR command already exists. Skipping...{RESET}")
            return

        print(f"{RED}Error: {mcsr_link} already exists.{RESET}")
        print(f"{RED}Please remove it before installing MCSR Tracker.{RESET}")
        sys.exit(1)

    mcsr_link.symlink_to(link_target)

# Main function tying everything together
def main() -> None:
    """Check the Python version and fetch the latest release from GitHub.
    Download MCSR Tracker and its checksum from GitHub.
    Compare the downloaded wheel against the checksum from GitHub to verify file integrity.
    Create a virtual environment for MCSR Tracker.
    Install MCSR Tracker into the virtual environment.
    Create a symlink for the 'mcsr' executable so the command can be run from anywhere in the system.
    """

    check_python_version()

    install_dir = DEFAULT_INSTALL_DIR

    print(f"{CYAN}Fetching latest release...{RESET}")
    _, whl_file, checksum_file = get_latest_release()

    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        whl_path = temp_path / whl_file["name"]
        checksum_path = temp_path / checksum_file["name"]

        print(f"{CYAN}Downloading MCSR Tracker...{RESET}")
        download_file(whl_file["browser_download_url"], whl_path)

        print(f"{CYAN}Downloading checksums...{RESET}")
        download_file(
            checksum_file["browser_download_url"],
            checksum_path,
        )

        print(f"{CYAN}Verifying file integrity...{RESET}")

        if not verify_checksum(checksum_path, whl_path):
            print(f"\n{RED}Error: Checksum verification failed.{RESET}")
            sys.exit(1)

        print(f"{GREEN}Checksum verified.{RESET}")

        print(f"{CYAN}Creating a virtual environment for MCSR Tracker...{RESET}")
        venv_dir = install_dir / "venv"
        create_venv(venv_dir)

        if os.name == "nt":
            venv_python = venv_dir / "Scripts" / "python.exe"
            mcsr_bin = venv_dir / "Scripts" / "mcsr.exe"
        else:
            venv_python = venv_dir / "bin" / "python"
            mcsr_bin = venv_dir / "bin" / "mcsr"

        if venv_python.exists():
            print(f"{CYAN}Existing MCSR Tracker installation found. Updating...{RESET}\n")
            subprocess.run(
                [
                    str(venv_python),
                    "-m",
                    "pip",
                    "install",
                    "--force-reinstall",
                    str(whl_path),
                ],
                check=True,
            )
            print(f"\n{GREEN}MCSR Tracker reinstalled successfully!{RESET}")
        else:
            print(f"{CYAN}Creating a virtual environment for MCSR Tracker...{RESET}")
            create_venv(venv_dir)

            print(f"{CYAN}Installing MCSR Tracker...{RESET}\n")
            subprocess.run(
                [str(venv_python), "-m", "pip", "install", str(whl_path)],
                check=True,
            )
            print(f"\n{GREEN}MCSR Tracker installed successfully!{RESET}")

    if os.name == "nt":
        # launcher for mcsr command without typing the full path
        launcher = install_dir / "mcsr.cmd"
        launcher.write_text(
            '@echo off\n"%~dp0venv\\Scripts\\python.exe" -m mcsr %*\n',
            encoding="utf-8",
        )

        print(f"""\n{CYAN}To use "mcsr" command from anywhere, add the following directory to your User PATH:

            {install_dir}

        Windows:

            1. Search for "Edit the system environment variables"
            2. Click "Environment Variables..." near the bottom
            3. Under "User variables for NAME" section, double click on "Path"
            4. Click "New" and add the directory above
            5. Click OK to save

        Restart your terminal after updating PATH.

        Then run:
            "mcsr setup" to configure your Minecraft instances for tracking.
            "mcsr --help" to see all available commands.{RESET}""")
    else:
        create_symlink(mcsr_bin)
        bin_dir = Path.home() / ".local" / "bin"

        if str(bin_dir) not in os.environ["PATH"].split(os.pathsep):
            print(f"""{CYAN}
"~/.local/bin" is not in your PATH. Add the following line to your shell
configuration file to make "mcsr" a global command:

    export PATH="$HOME/.local/bin:$PATH"{RESET}""")

        print(f"""{GREEN}
            Run "mcsr setup" to configure your Minecraft instances for tracking.
            Run "mcsr --help" to see all available commands.{RESET}\n""")


if __name__ == "__main__":
    main()
