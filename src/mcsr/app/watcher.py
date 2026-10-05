import json
import queue
import threading
import time
from typing import TYPE_CHECKING

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from mcsr.app.config import Instance, load_config, load_pending
from mcsr.app.logger import logger
from mcsr.app.paths import get_instance_path, get_pending_path
from mcsr.app.record import process_run

if TYPE_CHECKING:
    from sqlite3 import Connection

WORLD_QUEUE = queue.Queue()


# read state.json from hermes
def read_state(state_path: str) -> dict | None:
    timeout = 0.3
    deadline = time.monotonic() + timeout
    last_error = None

    while time.monotonic() < deadline:
        try:
            with open(state_path, encoding="utf-8") as f:
                return json.load(f)

        except (json.JSONDecodeError, OSError) as e:
            last_error = e

        time.sleep(0.01)

    logger.error(f"Failed to read {state_path}: {last_error}")
    return None


def process_queue(instance: Instance, conn: Connection):
    while True:
        world_dir = WORLD_QUEUE.get()

        try:
            full_world_dir = instance.instance_path / world_dir
            instance_name = instance.instance_name
            process_run(full_world_dir, instance_name, conn)
        except Exception:
            logger.exception(f"Error saving {world_dir}")
        finally:
            WORLD_QUEUE.task_done()


def start_watcher(instance: Instance, conn: Connection):
    hermes_path = instance.instance_path / "hermes" / "state.json"
    directory = hermes_path.parent
    filename = hermes_path.name

    threading.Thread(target=process_queue, args=(instance, conn), daemon=True).start()

    class MyHandler(FileSystemEventHandler):
        def __init__(self):
            pending = load_pending() or {}
            self.prev_prev_world_dir = pending.get("world")
            self.prev_world_dir = None

        def on_modified(self, event):
            if event.is_directory or not str(event.src_path).endswith(filename):
                return

            data = read_state(str(event.src_path))
            if data is None:
                return

            current_world = data["world"]

            # world -> menu/wall or world -> world
            if current_world is None:
                print(self.prev_prev_world_dir, self.prev_world_dir)
                if self.prev_prev_world_dir and self.prev_world_dir:
                    WORLD_QUEUE.put(self.prev_prev_world_dir)
                    self.prev_prev_world_dir = self.prev_world_dir
                    self.prev_world_dir = None
                    print(self.prev_prev_world_dir, self.prev_world_dir)
                return

            # menu/wall -> world
            print(self.prev_prev_world_dir, self.prev_world_dir)
            if self.prev_world_dir is None:
                self.prev_world_dir = current_world["path"]
                print(self.prev_prev_world_dir, self.prev_world_dir)
                return

            # instant reset
            current_world_dir = current_world["path"]
            print(self.prev_prev_world_dir, self.prev_world_dir)
            if current_world_dir != self.prev_world_dir:
                if self.prev_prev_world_dir:
                    WORLD_QUEUE.put(self.prev_prev_world_dir)

                self.prev_prev_world_dir = self.prev_world_dir
                self.prev_world_dir = current_world_dir
                print(self.prev_prev_world_dir, self.prev_world_dir)

    handler = MyHandler()
    observer = Observer()
    observer.schedule(handler, str(directory), recursive=False)
    observer.start()
    return handler, observer


def flush_foreign_pending(tracking_instance: str, conn: Connection):
    pending = load_pending()
    if not pending:
        return

    pending_instance = pending.get("instance")
    pending_world = pending.get("world")
    if not pending_instance or not pending_world:
        logger.error("Malformed pending.json, skipping flush")
        return

    if pending_instance == tracking_instance:
        return

    try:
        config = load_config()
        pending_instance_path = get_instance_path(config, pending_instance)
        pending_full_world_dir = pending_instance_path / pending_world

        process_run(pending_full_world_dir, pending_instance, conn)
        get_pending_path().unlink(missing_ok=True)

        logger.info(f"Flushed pending run for {pending_instance}")

    except KeyError as e:
        logger.error(f"Can't flush pending run, missing key: {e}")
    except Exception as e:
        logger.exception(f"Failed to flushed pending run: {e}")


def start_tracker(instance: Instance, conn: Connection):
    flush_foreign_pending(instance.instance_name, conn)

    handler, observer = start_watcher(instance, conn)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pending_world = handler.prev_prev_world_dir

        if pending_world:
            with open(get_pending_path(), "w", encoding="utf-8") as f:
                data = {"instance": instance.instance_name, "world": pending_world}

                json.dump(data, f, indent=4)

        observer.stop()
    observer.join()
