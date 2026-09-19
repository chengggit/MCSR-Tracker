import { msToTime } from "./helper.js";

const recentRunsBody = document.getElementById("recent-runs-body");

export function renderCards(stats) {
  const pb = document.getElementById("pb");
  const improvement = document.getElementById("improvement");
  const totalRuns = document.getElementById("total_runs");
  const resets = document.getElementById("resets");

  const daysAgo = Math.floor((Date.now() - new Date(stats.pb_date)) / 86400000);
  const sub = daysAgo === 0 ? "TODAY!" : `${daysAgo} days ago`;

  const improvementDelta = stats.first_completed_igt - stats.pb_igt;

  pb.querySelector(".card-value").textContent = msToTime(stats.pb_igt);
  pb.querySelector(".card-sub").textContent = sub;

  improvement.querySelector(".card-value").textContent =
    `-${msToTime(improvementDelta)}`;

  totalRuns.querySelector(".card-value").textContent = stats.total_runs;
  totalRuns.querySelector(".card-sub").textContent =
    `${stats.finish_rate}% finish rate`;

  resets.querySelector(".card-value").textContent = stats.resets;
}

export function renderRecentRuns(runs) {
  for (const r of runs) {
    const isCompleted = r.is_completed;
    const row = document.createElement("div");
    row.className = "recent-runs-row";
    row.setAttribute("data-run-id", r.id);

    function makeCell(text) {
      const cell = document.createElement("span");
      cell.className = "cell";
      cell.textContent = text;
      return cell;
    }

    const date = new Date(r.date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
    });

    row.appendChild(makeCell(r.world_name));
    row.appendChild(makeCell(date));

    if (isCompleted === 1) {
      row.appendChild(makeCell(msToTime(r.final_igt)));
      row.appendChild(makeCell(msToTime(r.final_rta)));
    } else {
      row.appendChild(makeCell("--:--.---"));
      row.appendChild(makeCell("--:--.---"));
    }

    recentRunsBody.appendChild(row);
  }
}

export function renderSplitsStats(stats) {
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
  if (stats.overall.best_igt) {
    completionRow.querySelector(".split-avg").textContent = msToTime(
      stats.overall.avg_igt,
    );
    completionRow.querySelector(".split-best").textContent = msToTime(
      stats.overall.best_igt,
    );
  }
}
