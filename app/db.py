import sqlite3
from pathlib import Path

DB_PATH = Path("data/runs.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.row_factory = sqlite3.Row

    try:
        yield conn
    finally:
        conn.close()


def initialize_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")

        conn.execute("""CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY,
            instance TEXT,
            world_name TEXT,
            run_type TEXT,
            category TEXT,
            final_igt INTEGER,
            final_rta INTEGER,
            retimed_igt INTEGER,
            date INTEGER,
            is_completed BOOLEAN,
            mc_version TEXT,
            UNIQUE(instance, world_name)
        )""")

        conn.execute("""CREATE TABLE IF NOT EXISTS timelines (
            id INTEGER PRIMARY KEY,
            run_id INTEGER REFERENCES runs(id),
            name TEXT,
            igt INTEGER,
            rta INTEGER
        )""")

    print("Database initialized successfully!")
