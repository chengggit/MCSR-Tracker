import json
import queue
import threading
import time
from typing import TYPE_CHECKING

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from app.logger import logger
from app.record import process_run

WORLD_QUEUE = queue.Queue()

if TYPE_CHECKING:
    from sqlite3 import Connection  # noqa: I001
    from app.config import Instance


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
            self.last_world_dir = None

        def on_modified(self, event):
            if event.is_directory or not str(event.src_path).endswith(filename):
                return

            data = read_state(str(event.src_path))
            if data is None:
                return

            world = data["world"]

            # world -> menu/wall or world -> world
            if world is None:
                if self.last_world_dir:
                    WORLD_QUEUE.put(self.last_world_dir)
                    self.last_world_dir = None
                return

            # menu/wall -> world
            if self.last_world_dir is None:
                self.last_world_dir = world["path"]
                return

            # instant reset
            world_dir = world["path"]
            if world_dir != self.last_world_dir:
                WORLD_QUEUE.put(self.last_world_dir)
                self.last_world_dir = world_dir

    handler = MyHandler()
    observer = Observer()
    observer.schedule(handler, str(directory), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
