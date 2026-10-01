import { msToTime } from "./helper.js";
import { renderTable } from "./table.js";

export function renderCards(stats) {
  const pb = document.getElementById("pb");
  const improvement = document.getElementById("improvement");
  const totalRuns = document.getElementById("total_runs");
  const resets = document.getElementById("resets");

  let daysAgo = "-";
  if (stats.pb_date) {
    daysAgo = Math.floor((Date.now() - new Date(stats.pb_date)) / 86400000);
  }
  const pbIgt = stats.pb_igt ? msToTime(stats.pb_igt) : "-";
  const pbSub = daysAgo === 0 ? "TODAY!" : `${daysAgo} days ago`;

  pb.querySelector(".card-value").textContent = pbIgt;
  pb.querySelector(".card-sub").textContent = pbSub;

  const improvementDelta = stats.first_completed_igt - stats.pb_igt;
  improvement.querySelector(".card-value").textContent =
    `-${msToTime(improvementDelta)}`;

  const finishRate = stats.finish_rate ? stats.finish_rate : 0;
  totalRuns.querySelector(".card-value").textContent = stats.total_runs;
  totalRuns.querySelector(".card-sub").textContent =
    `${finishRate}% finish rate`;

  resets.querySelector(".card-value").textContent = stats.resets;
}

export function renderRecentRuns(runs) {
  const container = document.getElementById("recent-runs-body");
  if (!container || !runs) return;

  const runIds = runs.map((r) => r.id);
  const worldNames = runs.map((r) => r.world_name ?? "Unknown");
  const dates = runs.map((r) =>
    new Date(r.date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
    }),
  );
  const igts = runs.map((r) =>
    r.is_completed === 1 ? msToTime(r.final_igt) : "-",
  );
  const rtas = runs.map((r) =>
    r.is_completed === 1 ? msToTime(r.final_rta) : "-",
  );

  renderTable({
    container,
    rowConfig: {
      className: "recent-runs-row",
      getAttrs: (i) => `data-run-id="${runIds[i]}"`,
    },
    columns: [
      { key: "world", className: "cell-world", values: worldNames },
      { key: "date", className: "cell-date", values: dates },
      { key: "igt", className: "cell-igt", values: igts },
      { key: "rta", className: "cell-rta", values: rtas },
    ],
  });
}

export function renderSplitsStats(stats) {
  for (const row of document.querySelectorAll(".split-row")) {
    row.querySelector(".split-avg").textContent = "";
    row.querySelector(".split-best").textContent = "";
  }

  for (const split of stats.splits) {
    const row = document.querySelector(
      `.split-row[data-split="${split.name}"]`,
    );
    if (!row) continue;

    row.querySelector(".split-avg").textContent = msToTime(split.avg_igt);
    row.querySelector(".split-best").textContent = msToTime(split.best_igt);
  }
  const completionRow = document.querySelector(
    `.split-row[data-split="completion"]`,
  );

  completionRow.querySelector(".split-avg").textContent = stats.overall.best_igt
    ? msToTime(stats.overall.avg_igt)
    : "";

  completionRow.querySelector(".split-best").textContent = stats.overall
    .best_igt
    ? msToTime(stats.overall.best_igt)
    : "";
}
