import sqlite3


def get_run_by_id(run_id: int, conn: sqlite3.Connection):
    row = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()

    return dict(row) if row else None


def get_run_by_world(world_name: str, instance: str, conn: sqlite3.Connection):
    row = conn.execute(
        "SELECT * FROM runs WHERE world_name = ? AND instance = ?",
        (world_name, instance),
    ).fetchone()

    return dict(row) if row else None


def get_run_timelines(run_id: int, conn: sqlite3.Connection):
    rows = conn.execute(
        "SELECT * FROM timelines WHERE run_id = ?", (run_id,)
    ).fetchall()

    return [dict(row) for row in rows]


def get_run_id(world_name: str, instance: str, conn: sqlite3.Connection):
    row = conn.execute(
        "SELECT id FROM runs WHERE world_name = ? AND instance = ?",
        (world_name, instance),
    ).fetchone()

    return row["id"]


def get_runs_stats(conn: sqlite3.Connection):
    row = conn.execute(
        """SELECT
        ROUND(AVG(r.final_igt)) AS avg_igt,
        MIN(r.final_igt) AS best_igt,

            (SELECT r2.world_name FROM runs r2
            WHERE r2.is_completed = 1
            ORDER BY r2.final_igt, r2.final_rta
            LIMIT 1) AS pb_world

        FROM runs r
        WHERE is_completed = 1
        ORDER BY best_igt
        """
    ).fetchone()
    return row


def get_splits_stats(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT t.name,
        ROUND(AVG(t.igt)) AS avg_igt,
        MIN(t.igt) AS best_igt,

            (SELECT t2.run_id FROM timelines t2
            WHERE t2.name = t.name
            ORDER BY t2.igt, t2.rta
            LIMIT 1) AS best_run_id

        FROM timelines t
        GROUP BY t.name
        ORDER BY best_igt
        """
    ).fetchall()

    return [dict(row) for row in rows]


def get_stats(conn: sqlite3.Connection) -> dict:
    stats = {}

    row = conn.execute("SELECT COUNT(*) AS total_runs FROM runs").fetchone()
    stats["total_runs"] = row["total_runs"]

    row = conn.execute(
        "SELECT COUNT(*) AS completed_runs FROM runs WHERE is_completed = 1"
    ).fetchone()
    stats["completed_runs"] = row["completed_runs"]

    row = conn.execute(
        "SELECT COUNT(*) AS resets FROM runs WHERE is_completed != 1"
    ).fetchone()
    stats["resets"] = row["resets"]

    row = conn.execute(
        "SELECT ROUND(100.0 * SUM(is_completed) / COUNT(*), 1) AS finish_rate FROM runs"
    ).fetchone()
    stats["finish_rate"] = row["finish_rate"]

    row = conn.execute(
        "SELECT MIN(final_igt) AS pb_igt FROM runs WHERE is_completed = 1"
    ).fetchone()
    stats["pb_igt"] = row["pb_igt"]

    row = conn.execute(
        "SELECT date AS pb_date FROM runs WHERE is_completed = 1 ORDER BY final_igt"
    ).fetchone()
    stats["pb_date"] = row["pb_date"]

    row = conn.execute(
        "SELECT final_igt AS first_completed_igt FROM runs WHERE is_completed = 1 ORDER BY id ASC LIMIT 1"
    ).fetchone()
    stats["first_completed_igt"] = row["first_completed_igt"]

    rows = conn.execute(
        "SELECT name, COUNT(DISTINCT run_id) AS runs_reached FROM timelines GROUP BY name ORDER BY runs_reached DESC"
    ).fetchall()
    stats["split_reach"] = {row["name"]: row["runs_reached"] for row in rows}

    return stats


def get_daily_finish_rate(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT (date / 86400000) * 86400000 AS day_start,
        COUNT(*) AS total,
        SUM(is_completed) AS completed
        FROM runs
        GROUP BY day_start
        ORDER BY day_start"""
    ).fetchall()
    return [dict(row) for row in rows]


def get_runs(
    conn: sqlite3.Connection,
    instance: str | None,
    run_type: str | None,
    version: str | None,
    completed: bool | None,
    limit: int,
    offset: int,
    sort_by: str,
    order: str,
) -> list[dict]:

    query = "SELECT * FROM runs"
    filters = []
    params = []

    if instance is not None:
        filters.append("instance = ?")
        params.append(instance)

    if run_type is not None:
        filters.append("run_type = ?")
        params.append(run_type)

    if version is not None:
        filters.append("mc_version = ?")
        params.append(version)

    if completed is not None:
        filters.append("is_completed = ?")
        params.append(int(completed))

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += f" ORDER BY {sort_by} {order} LIMIT {limit} OFFSET {offset}"

    rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]
