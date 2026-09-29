import sqlite3

from mcsr.app.paths import get_db_path

DB_PATH = get_db_path()


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.row_factory = sqlite3.Row

    try:
        yield conn
    finally:
        conn.close()


def initialize_db() -> None:
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

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timelines_run_id ON timelines(run_id)"
        )

        conn.execute("PRAGMA user_version = 1")

    print("Database initialized successfully!")
