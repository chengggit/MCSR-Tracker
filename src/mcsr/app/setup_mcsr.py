import os
import sys
from pathlib import Path

import questionary
from questionary import Choice

from mcsr.app.config import Instance, load_config, save_config
from mcsr.app.db import initialize_db
from mcsr.app.paths import get_db_path, mcsr_home

# ANSI escape sequences for terminal styling
BOLD = "\033[1m"
RESET = "\033[0m"
GREEN = "\033[32m"
CYAN = "\033[36m"
RED = "\033[31m"
GRAY = "\033[90m"


# Get instances directory, check and save to config
def get_instances_dir(config: dict) -> Path | None:
    saved_dir = config["instances_dir"]
    while True:
        if saved_dir and Path(saved_dir).is_dir():
            use_saved = questionary.confirm(
                f'Instances directory found at "{saved_dir}". Use this directory?'
            ).ask()

            if use_saved is None:
                print("No input provided. Exiting.")
                return
            if use_saved:
                instances_dir = Path(saved_dir)
                break
            else:
                saved_dir = ""

        # instances dir found in config but doesn't exist
        elif saved_dir:
            print("No valid instances directory found in config.")
            saved_dir = ""

        user_input = questionary.text("Enter the path to your instances directory here:").ask()

        if user_input is None:
            print("No input provided. Exiting.")
            return

        instances_dir = Path(user_input)

        if instances_dir.exists() and instances_dir.is_dir():
            config["instances_dir"] = str(instances_dir)
            save_config(config)
            print(f"{GREEN}Saved instances directory to config.json.{RESET}")
            break
        else:
            print(f"{RED}Directory does not exist or is invalid. Please try again.{RESET}")

    return instances_dir


def select_instance(instances_dir: Path) -> Instance:
    instances = [f for f in Path(instances_dir).iterdir() if f.is_dir()]

    # Ask questions
    choices = [Choice(title=f.name, value=f) for f in instances]
    chosen = questionary.select("Select your instance:", choices=choices).ask()
    name = questionary.text("Name this instance:", default=chosen.name).ask()

    return Instance(name, chosen)


def get_minecraft_dir(instance: Instance) -> Path | None:
    for name in ["minecraft", ".minecraft"]:
        candidate = instance.instance_path / name
        if candidate.exists():
            return candidate

    return None


def check_mods(minecraft_dir: Path) -> bool:
    print(f"{CYAN}Checking mods..{RESET}")

    required_mods = {
        "atum-*.jar": "Atum",
        "hermes-*.jar": "Hermes",
        "hermes-core-*.jar": "Hermes Core",
        "speedrunigt-*.jar": "SpeedrunIGT",
    }
    mods_dir = minecraft_dir / "mods"

    missing_mods = [
        name
        for pattern, name in required_mods.items()
        if not any(mods_dir.glob(pattern, case_sensitive=False))
    ]
    if missing_mods:
        print(f"{RED}Missing mods:{RESET}")
        for mod in missing_mods:
            print(f"{RED}  - {mod}{RESET}")
        return False

    check_hermes = minecraft_dir / "hermes" / "state.json"
    check_atum = minecraft_dir / "config" / "mcsr" / "atum"

    if not check_hermes.exists() or not check_atum.exists():
        print(f"{RED}Mods found but is not initialized. Enter a world to initalize the mods.{RESET}")
        return False

    print(f"{GREEN}Required mods found!{RESET}")
    return True


def update_config(instance: Instance) -> None:
    instance_name = str(instance.instance_name)
    instance_path = str(instance.instance_path)

    config = load_config()
    config["instances"][instance_name] = instance_path
    save_config(config)
    print(f"{GREEN}Updated config.{RESET}")


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


def setup() -> None:
    config = load_config()
    db_path = get_db_path()

    if not db_path.exists():
        initialize_db()

    instances_dir = get_instances_dir(config)
    if instances_dir is None:
        return

    while True:
        selected = select_instance(instances_dir)

        minecraft_dir = get_minecraft_dir(selected)
        if minecraft_dir is None:
            print(
                f"{RED}Couldn't find minecraft folder. Make sure you've opened the instance at least once.{RESET}"
            )
            return

        mod_status = check_mods(minecraft_dir)
        if not mod_status:
            return

        instance = Instance(selected.instance_name, minecraft_dir)
        update_config(instance)

        add_more = questionary.confirm(
            "Instance setup complete! Do you want to set up another instance?"
        ).ask()
        if not add_more:
            break

    if os.name == "nt":
        bin_path = mcsr_home() / "mcsr.cmd"
    else:
        bin_path = Path.home() / ".local" / "bin" / "mcsr"

    if not bin_path.exists():
        print(f'{CYAN}"mcsr" is not a global command yet.{RESET}')

        if questionary.confirm('Would you like to make "mcsr" available as a global command?').ask():
            if os.name == "nt":
                # launcher for mcsr command without typing the full path
                bin_path.write_text(
                    '@echo off\n"%~dp0venv\\Scripts\\python.exe" -m mcsr %*\n',
                    encoding="utf-8",
                )

                print(f"""\n{CYAN}To use "mcsr" command from anywhere, add the following directory to your User PATH:

                    {mcsr_home()}

                Windows:

                    1. Search for "Edit the system environment variables"
                    2. Click "Environment Variables..." near the bottom
                    3. Under "User variables for NAME" section, double click on "Path"
                    4. Click "New" and add the directory above
                    5. Click OK to save

                Restart your terminal after updating PATH.

                Then type:
                    "mcsr --help" to get started.{RESET}""")
            else:
                mcsr_bin = Path(sys.executable).parent / "mcsr"
                create_symlink(mcsr_bin)

    print(f"{GREEN}Setup complete!{RESET}")


if __name__ == "__main__":
    setup()
