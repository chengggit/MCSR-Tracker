import json
from enum import StrEnum
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from mcsr.app.db import get_db
from mcsr.app.paths import get_config_path
from mcsr.app.runs import (
    fetch_dashboard_stats,
    fetch_monthly_activity_summary,
    fetch_run_by_id,
    fetch_run_by_world,
    fetch_runs,
    fetch_splits_stats,
)

router = APIRouter(prefix="/api")


# --- Params ---
#
class SortBy(StrEnum):
    date = "date"
    id = "id"
    final_igt = "final_igt"
    final_rta = "final_rta"


class Order(StrEnum):
    descending = "DESC"
    ascending = "ASC"


class RunTypes(StrEnum):
    set_seed = "set_seed"
    random_seed = "random_seed"


@router.get("/config", responses={404: {"description": "Config not found"}})
def get_config():
    with open(get_config_path(), encoding="utf-8") as f:
        return json.load(f)


# --- Single Run Endpoints ---
#
@router.get("/runs/{run_id}", responses={404: {"description": "Run not found"}})
def get_run_by_id(run_id: int, conn=Depends(get_db)):
    """Fetch a single run by ID."""
    run_data = fetch_run_by_id(run_id, conn)

    if not run_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run with ID {run_id} not found",
        )
    return run_data


@router.get(
    "/runs/world/{world_name}", responses={404: {"description": "World not found"}}
)
def get_run_by_world(world_name: str, instance: str, conn=Depends(get_db)):
    """Fetch a single run by world name and instance name."""
    run_data = fetch_run_by_world(world_name, instance, conn)

    if not run_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"World '{world_name}' not found for instance '{instance}'",
        )
    return run_data


# --- Collection Endpoints ---
#
@router.get("/runs")
def get_runs(
    instance: str | None = None,
    run_type: RunTypes | None = None,
    version: str | None = None,
    completed: bool | None = None,
    limit: int = -1,
    offset: int = 0,
    sort_by: SortBy = SortBy.date,
    order: Order = Order.descending,
    conn=Depends(get_db),
):
    """Fetch a list of runs with optional filtering, pagination, and sorting."""
    return fetch_runs(
        conn,
        instance=instance,
        run_type=run_type.value if run_type else None,
        version=version,
        completed=completed,
        limit=limit,
        offset=offset,
        sort_by=sort_by.value,
        order=order.value,
    )


# --- Stats & Analytics Endpoints ---
#
@router.get("/stats/dashboard")
def get_dashboard_stats(instance: str | None = None, conn=Depends(get_db)):
    """Fetch aggregated dashboard summary stats (counts, rates, PB, split reach)."""
    return fetch_dashboard_stats(instance, conn)


@router.get("/stats/splits")
def get_splits_stats(instance: str | None = None, conn=Depends(get_db)):
    """Fetch combined overall run timing averages along with per-split stats."""
    return fetch_splits_stats(instance, conn)


@router.get("/activity/monthly")
def get_monthly_activity(instance: str | None = None, conn=Depends(get_db)):
    """Fetch monthly run counts and completion breakdown for activity charts."""
    return fetch_monthly_activity_summary(instance, conn)


# --- App Init ---
#
app = FastAPI(title="MCSR Tracker API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app.include_router(router)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
