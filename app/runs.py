import json
import sqlite3


# --- Single Run Queries ---
#
def fetch_run_by_id(run_id: int, conn: sqlite3.Connection) -> dict | None:
    query = """
    SELECT
        r.*,

        json_group_array(
            json_object('name', t.name, 'igt', t.igt, 'rta', t.rta)
        ) FILTER (WHERE t.id IS NOT NULL) AS timelines

    FROM runs r
    LEFT JOIN timelines t ON r.id = t.run_id
    WHERE r.id = ?
    GROUP BY r.id
    """

    row = conn.execute(query, (run_id,)).fetchone()
    if not row:
        return None

    data = dict(row)
    data["timelines"] = json.loads(data["timelines"]) if data["timelines"] else []
    return data


def fetch_run_by_world(
    world_name: str, instance: str, conn: sqlite3.Connection
) -> dict | None:
    query = """
    SELECT
        r.*,

        json_group_array(
            json_object('name', t.name, 'igt', t.igt, 'rta', t.rta)
        ) FILTER (WHERE t.id IS NOT NULL) AS timelines

    FROM runs r
    LEFT JOIN timelines t ON r.id = t.run_id
    WHERE r.world_name = ? AND r.instance = ?
    GROUP BY r.id
    """

    row = conn.execute(query, (world_name, instance)).fetchone()
    if not row:
        return None

    data = dict(row)
    data["timelines"] = json.loads(data["timelines"]) if data["timelines"] else []
    return data


# --- Collection Queries ---
#
def fetch_runs(
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


# --- Stats & Analytics Queries ---
#
def fetch_dashboard_stats(conn: sqlite3.Connection) -> dict:
    stats_query = """
    SELECT
        COUNT(*) AS total_runs,
        SUM(is_completed) AS completed_runs,
        COUNT(*) - SUM(is_completed) AS resets,
        ROUND(100.0 * SUM(is_completed) / COUNT(*), 1) AS finish_rate,
        MIN(CASE WHEN is_completed = 1 THEN final_igt END) AS pb_igt,

        (SELECT date FROM runs WHERE is_completed = 1 ORDER BY final_igt ASC LIMIT 1) AS pb_date,
        (SELECT final_igt FROM runs WHERE is_completed = 1 ORDER BY id ASC LIMIT 1) AS first_completed_igt

    FROM runs
    """
    stats = dict(conn.execute(stats_query).fetchone())

    split_reach_query = """
    SELECT name, COUNT(DISTINCT run_id) AS runs_reached
    FROM timelines
    GROUP BY name
    ORDER BY runs_reached DESC
    """
    rows = conn.execute(split_reach_query).fetchall()
    stats["split_reach"] = {row["name"]: row["runs_reached"] for row in rows}

    return stats


def fetch_splits_stats(conn: sqlite3.Connection) -> dict:
    # Fetch overall completed run stats
    overall_query = """
    SELECT
        ROUND(AVG(r.final_igt)) AS avg_igt,
        MIN(r.final_igt) AS best_igt,

        (SELECT r2.id FROM runs r2
         WHERE r2.is_completed = 1
         ORDER BY r2.final_igt, r2.final_rta
         LIMIT 1) AS pb_run_id

    FROM runs r
    WHERE is_completed = 1
    """

    overall_row = conn.execute(overall_query).fetchone()
    overall_stats = dict(overall_row) if overall_row else {}

    # Fetch split by split stats
    splits_query = """
    WITH mapped_splits AS (
        SELECT
            t.run_id,
            t.igt,
            t.rta,

            CASE
                WHEN t.name IN ('enter_bastion', 'enter_fortress') THEN
                    'structure_' || ROW_NUMBER() OVER (
                        PARTITION BY t.run_id,
                        CASE WHEN t.name IN ('enter_bastion', 'enter_fortress') THEN 1 ELSE 0 END
                        ORDER BY t.igt
                    )
                ELSE t.name
            END AS name
        FROM timelines t
    )

    SELECT
        m.name,
        ROUND(AVG(m.igt)) AS avg_igt,
        MIN(m.igt) AS best_igt,

        (
            SELECT m2.run_id
            FROM mapped_splits m2
            WHERE m2.name = m.name
            ORDER BY m2.igt, m2.rta
            LIMIT 1
        ) AS best_run_id

    FROM mapped_splits m
    GROUP BY m.name
    ORDER BY best_igt
    """

    splits_rows = conn.execute(splits_query).fetchall()

    return {
        "overall": overall_stats,
        "splits": [dict(row) for row in splits_rows],
    }


def fetch_monthly_activity_summary(
    conn: sqlite3.Connection,
) -> list[tuple[str, int, int]]:
    query = """
    SELECT
      strftime('%Y-%m-01', date / 1000, 'unixepoch') AS month_start,
      COUNT(*) AS total,
      SUM(is_completed) AS completed
    FROM runs
    GROUP BY month_start
    ORDER BY month_start ASC
    """

    return conn.execute(query).fetchall()
