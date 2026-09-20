import {
  fetchRecentRuns,
  fetchRunById,
  fetchSplitsStats,
  fetchDashboardStats,
} from "./js/api.js";

import { renderActivityChart, renderPerformanceChart } from "./js/chart.js";

import {
  renderCards,
  renderRecentRuns,
  renderSplitsStats,
} from "./js/dashboard.js";

import { renderDropdown } from "./js/dropdown.js";

import { RunModal } from "./js/modal.js";

async function renderInstanceDropdown() {
  const res = await fetch("api/config");
  const config = await res.json();

  const items = Object.keys(config.instances).map((name) => {
    return {
      name: name,
      callback: () => {},
    };
  });
  const instanceBtn = document.getElementById("instance-btn");
  renderDropdown({
    trigger: instanceBtn,
    items: items,
  });
}

renderInstanceDropdown();

fetchDashboardStats()
  .then(renderCards)
  .catch((err) => {
    console.error("Couldn't load dashboard stats:", err);
  });

fetchSplitsStats()
  .then(renderSplitsStats)
  .catch((err) => {
    console.error("Couldn't load splits stats:", err);
  });

fetchRecentRuns()
  .then(renderRecentRuns)
  .catch((err) => {
    console.error("Couldn't load recent runs:", err);
  });

renderPerformanceChart();
renderActivityChart();

// Initialize and load RunModal
document.addEventListener("DOMContentLoaded", () => {
  RunModal.init();

  const runsContainer = document.getElementById("recent-runs-body");

  runsContainer.addEventListener("click", async (e) => {
    const row = e.target.closest(".recent-runs-row");
    if (!row) return;

    const runId = row.dataset.runId;

    try {
      const runData = await fetchRunById(runId);
      const allSplitsData = await fetchSplitsStats();

      const pbRunId = allSplitsData.overall.pb_run_id;
      const pbRunData = pbRunId ? await fetchRunById(pbRunId) : null;

      RunModal.open(runData, allSplitsData, pbRunData);
    } catch (err) {
      console.error("Failed to load run details:", err);
    }
  });
});
