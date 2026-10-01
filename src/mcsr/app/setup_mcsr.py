from pathlib import Path

import questionary
from questionary import Choice

from mcsr.app.config import Instance, load_config, save_config
from mcsr.app.db import initialize_db
from mcsr.app.paths import get_db_path


# Get instances directory, check and save to config
def get_instances_dir(config: dict) -> Path | None:
    saved_dir = config["instances_dir"]
    while True:
        if saved_dir and Path(saved_dir).exists():
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
                continue

        elif saved_dir:
            print("No valid instances directory found in config.")
            saved_dir = ""

        user_input = questionary.text(
            "Enter the path to your instances directory here:"
        ).ask()

        if user_input is None:
            print("No input provided. Exiting.")
            return

        instances_dir = Path(user_input)

        if instances_dir.exists() and instances_dir.is_dir():
            config["instances_dir"] = str(instances_dir)
            save_config(config)
            print("Saved instances directory to config.json")
            break
        else:
            print("Directory does not exist or is invalid. Please try again.")

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
    print("Checking mods..")

    required_mods = [
        "atum-*.jar",
        "hermes-*.jar",
        "hermes-core-*.jar",
        "speedrunigt-*.jar",
    ]
    mods_dir = minecraft_dir / "mods"

    missing_mods = [
        mod
        for mod in required_mods
        if not any(mods_dir.glob(mod, case_sensitive=False))
    ]

    if missing_mods:
        print(f"Missing mods: {', '.join(missing_mods)}")
        return False

    check_hermes = minecraft_dir / "hermes" / "state.json"
    check_atum = minecraft_dir / "config" / "mcsr" / "atum"

    if not check_hermes.exists() or not check_atum.exists():
        print("Mods found but is not initialized. Enter a world to initalize the mods")
        return False

    print("Required mods found!")
    return True


def update_config(instance: Instance) -> None:
    instance_name = str(instance.instance_name)
    instance_path = str(instance.instance_path)

    config = load_config()
    config["instances"][instance_name] = instance_path
    save_config(config)
    print("Updated config")


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
                "Couldn't find minecraft folder. Make sure you've opened the instance at least once."
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
        if add_more:
            continue
        else:
            break

    print("Setup complete!")


if __name__ == "__main__":
    setup()
