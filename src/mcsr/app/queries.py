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
    date: int | None,
    before_date: int | None,
    after_date: int | None,
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

    if date is not None:
        filters.append("date = ?")
        params.append(date)

    if before_date is not None:
        filters.append("date < ?")
        params.append(before_date)

    if after_date is not None:
        filters.append("date > ?")
        params.append(after_date)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += f" ORDER BY {sort_by} {order} LIMIT {limit} OFFSET {offset}"

    rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


# --- Stats & Analytics Queries ---
#
def fetch_dashboard_stats(instance: str | None, conn: sqlite3.Connection) -> dict:
    """
    Fetches top-level dashboard metrics (total runs, completions, PB date, etc.)
    and split reach counts.
    Fetches across all instances if `instance` is None.
    """

    # --- Top-Level Summary Stats Query

    if instance is None:
        outer_where = ""
        sub_where = "WHERE is_completed = 1"
        stats_params = ()
    else:
        outer_where = "WHERE instance = ?"
        sub_where = "WHERE is_completed = 1 AND instance = ?"
        # Parameters match order: pb_date subquery, first_completed_igt subquery, outer query
        stats_params = (instance, instance, instance)

    stats_query = f"""
    SELECT
        COUNT(*) AS total_runs,
        COALESCE(SUM(is_completed), 0) AS completed_runs,
        COUNT(*) - COALESCE(SUM(is_completed), 0) AS resets,
        ROUND(100.0 * COALESCE(SUM(is_completed), 0) / NULLIF(COUNT(*), 0), 1) AS finish_rate,
        MIN(CASE WHEN is_completed = 1 THEN final_igt END) AS pb_igt,

        -- PB Date
        (SELECT date FROM runs {sub_where} ORDER BY final_igt ASC, final_rta ASC LIMIT 1) AS pb_date,

        -- Final IGT of the very first completed run
        (SELECT final_igt FROM runs {sub_where} ORDER BY id ASC LIMIT 1) AS first_completed_igt

    FROM runs
    {outer_where}
    """

    row = conn.execute(stats_query, stats_params).fetchone()
    stats = dict(row) if row else {}

    # --- Split Reach Count Query

    if instance is None:
        reach_where = ""
        reach_params = ()
    else:
        reach_where = "WHERE r.instance = ?"
        reach_params = (instance,)

    split_reach_query = f"""
    SELECT t.name, COUNT(DISTINCT t.run_id) AS runs_reached
    FROM timelines t
    JOIN runs r ON t.run_id = r.id
    {reach_where}
    GROUP BY t.name
    ORDER BY runs_reached DESC
    """

    rows = conn.execute(split_reach_query, reach_params).fetchall()
    stats["split_reach"] = {row["name"]: row["runs_reached"] for row in rows}

    return stats


def fetch_splits_stats(instance: str | None, conn: sqlite3.Connection) -> dict:
    """
    Fetches average/best times and best-run IDs for completed runs and individual splits.
    Fetches across all instances if `instance` is None.

    Maps Bastion/Fortress entries to 'structure_1' and 'structure_2'
    chronologically per run so split averages aren't skewed by entry order.
    """

    if instance is None:
        overall_where = "is_completed = 1"
        overall_params = ()
    else:
        overall_where = "is_completed = 1 AND instance = ?"
        overall_params = (instance, instance)

    overall_query = f"""
    SELECT
        ROUND(AVG(r.final_igt)) AS avg_igt,
        MIN(r.final_igt) AS best_igt,

        (SELECT r2.id FROM runs r2
         WHERE {overall_where}
         ORDER BY r2.final_igt, r2.final_rta
         LIMIT 1) AS pb_run_id

    FROM runs r
    WHERE {overall_where}
    """

    overall_row = conn.execute(overall_query, overall_params).fetchone()
    overall_stats = dict(overall_row) if overall_row else {}

    if instance is None:
        splits_where = ""
        splits_params = ()
    else:
        splits_where = "WHERE r.instance = ?"
        splits_params = (instance,)

    splits_query = f"""

    -- STRUCTURE NORMALIZATION CTE:
    -- Normalize bastion/fortress entries to structure_1/2 to whichever is first

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
        JOIN runs r ON t.run_id = r.id
        {splits_where}
    )


    -- Subquery to find the run ID that achieved the fastest time for this specific split.
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

    splits_rows = conn.execute(splits_query, splits_params).fetchall()

    return {
        "overall": overall_stats,
        "splits": [dict(row) for row in splits_rows],
    }


def fetch_monthly_activity_summary(
    instance: str | None, conn: sqlite3.Connection
) -> dict:
    """
    Fetches monthly attempt/completion activity (last 6 months) and current year's totals.
    Fetches across all instances if `instance` is None.
    """

    if instance is None:
        monthly_where = ""
        monthly_params = ()
    else:
        monthly_where = "WHERE instance = ?"
        monthly_params = (instance,)

    monthly_query = f"""
    SELECT
        -- Convert millisecond timestamp to 'YYYY-MM-01' format

        strftime('%Y-%m-01', date / 1000, 'unixepoch') AS month_start,
        COUNT(*) AS total,
        COALESCE(SUM(is_completed), 0) AS completions
    FROM runs
    {monthly_where}
    GROUP BY month_start
    ORDER BY month_start DESC
    LIMIT 6
    """

    monthly_row = conn.execute(monthly_query, monthly_params).fetchall()
    # Reverse to return chronologically (oldest to newest for the chart)
    monthly = [dict(row) for row in reversed(monthly_row)]

    if instance is None:
        yearly_where = (
            "WHERE strftime('%Y', date / 1000, 'unixepoch') = strftime('%Y', 'now')"
        )
        yearly_params = ()
    else:
        yearly_where = "WHERE strftime('%Y', date / 1000, 'unixepoch') = strftime('%Y', 'now') AND instance = ?"
        yearly_params = (instance,)

    yearly_query = f"""
    SELECT
        COUNT(*) AS yearly_attempts,
        COALESCE(SUM(is_completed), 0) AS yearly_completions
    FROM runs
    {yearly_where}
    """

    yearly_row = conn.execute(yearly_query, yearly_params).fetchone()
    yearly = dict(yearly_row) if yearly_row else {}

    return {
        "monthly": monthly,
        "yearly_attempts": yearly.get("yearly_attempts", 0),
        "yearly_completions": yearly.get("yearly_completions", 0),
    }
