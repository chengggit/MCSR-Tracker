import hashlib
import json
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from packaging.version import Version

from mcsr import __version__

API_URL = "https://api.github.com/repos/chengggit/MCSR-Tracker/releases/latest"


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
        print(f"Error: {e.code} - {e.reason}")
        sys.exit(1)
    except URLError as e:
        print(f"URL Error: {e.reason}")
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


def has_updates(tag_name: str) -> bool:
    current = Version(__version__)
    latest = Version(tag_name.removeprefix("v"))

    if latest > current:
        print(f"Update available: {latest}")
        return True

    print("MCSR Tracker is already up to date.")
    return False


def updater(force: bool = False) -> None:
    tag_name, whl_file, checksum_file = get_latest_release()

    if not force and not has_updates(tag_name):
        return

    with TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        whl_path = temp_path / whl_file["name"]
        checksum_path = temp_path / checksum_file["name"]

        print("Downloading update...")
        download_file(whl_file["browser_download_url"], whl_path)

        print("Downloading checksums...")
        download_file(checksum_file["browser_download_url"], checksum_path)

        if not verify_checksum(checksum_path, whl_path):
            print("Error: Checksum verification failed. Update aborted.")
            return

        # Forcing update basically acts as a reinstaller and will install the latest release
        if force:
            print("Reinstalling...")
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "--force-reinstall",
                    str(whl_path),
                ],
                check=True,
            )
            print("MCSR Tracker reinstalled successfully.")
        else:
            print("Updating...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--upgrade", str(whl_path)],
                check=True,
            )
            print("MCSR Tracker updated successfully.")
