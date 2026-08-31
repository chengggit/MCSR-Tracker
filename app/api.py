from enum import StrEnum

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import get_db
from app.runs import (
    get_daily_finish_rate,
    get_run_by_id,
    get_run_by_world,
    get_run_id,
    get_run_timelines,
    get_runs,
    get_runs_stats,
    get_splits_stats,
    get_stats,
)

router = APIRouter(prefix="/api")
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


# Filter or get all runs
@router.get("/runs")
def get_runs_endpoint(
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
    return get_runs(
        conn,
        instance,
        run_type,
        version,
        completed,
        limit,
        offset,
        sort_by.value,
        order.value,
    )


@router.get("/stats")
def get_dashboard_stats_endpoint(conn=Depends(get_db)):
    return get_stats(conn)


@router.get("/runs/stats")
def get_runs_stats_endpoint(conn=Depends(get_db)):
    return get_runs_stats(conn)


@router.get("/splits/stats")
def get_splits_stats_endpoint(conn=Depends(get_db)):
    stats = get_splits_stats(conn)
    for s in stats:
        run = get_run_by_id(s["best_run_id"], conn)
        s["best_world"] = run["world_name"] if run else None
    return stats


@router.get("/world/{world_name}", responses={404: {"description": "World not found"}})
def get_run_by_world_endpoint(world_name: str, instance: str, conn=Depends(get_db)):
    metadata = get_run_by_world(world_name, instance, conn)

    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{world_name} not found for instance {instance}",
        )

    run_id = get_run_id(world_name, instance, conn)
    timelines = get_run_timelines(run_id, conn)

    metadata["timelines"] = timelines
    return metadata


@router.get("/id/{run_id}", responses={404: {"description": "World not found"}})
def get_run_by_id_endpoint(run_id: int, conn=Depends(get_db)):
    metadata = get_run_by_id(run_id, conn)

    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Run {run_id} not found"
        )

    timelines = get_run_timelines(run_id, conn)
    metadata["timelines"] = timelines
    return metadata


@router.get("/charts/finish-rate")
def get_finish_rate_endpoint(conn=Depends(get_db)):
    return get_daily_finish_rate(conn)


app.include_router(router)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
