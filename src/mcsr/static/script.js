import {
  fetchRunById,
  fetchDashboardStats,
  fetchSplitsStats,
  fetchRecentRuns,
  fetchMonthlyActivity,
  fetchRecent12CompletedRuns,
  fetch2ndFastestBeforePB,
} from "./js/api.js";

import { renderMonthlyActivity, renderPerformanceChart } from "./js/chart.js";

import {
  renderCards,
  renderRecentRuns,
  renderSplitsStats,
} from "./js/dashboard.js";

import { renderDropdown } from "./js/dropdown.js";

import { RunModal } from "./js/modal.js";

async function fetchDashboardData(instance, options = {}) {
  const [stats, splits, activity, recentRuns, performanceChart] =
    await Promise.all([
      fetchDashboardStats(instance, options),
      fetchSplitsStats(instance, options),
      fetchMonthlyActivity(instance, options),
      fetchRecentRuns(instance, 8, options),
      fetchRecent12CompletedRuns(instance, options),
    ]);

  return { stats, splits, activity, recentRuns, performanceChart };
}

let activeAbortController = null;
async function loadDashboard(instance) {
  if (!instance) return;
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  try {
    const data = await fetchDashboardData(instance, { signal });

    renderCards(data.stats);
    renderSplitsStats(data.splits);
    renderMonthlyActivity(data.activity);
    renderRecentRuns(data.recentRuns);
    renderPerformanceChart(data.performanceChart);
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Error loading dashboard data:", err);
  }
}

function renderInstanceDropdown(instances = [], onSelect) {
  const instanceBtn = document.getElementById("instance-btn");

  if (!instanceBtn || instances.length === 0) return;

  const handleSelect = (instanceName) => {
    const labelSpan = instanceBtn.querySelector(".btn-text");

    labelSpan.textContent = instanceName;
    instanceBtn.dataset.value = instanceName;

    if (typeof onSelect === "function") {
      onSelect(instanceName);
    }
  };

  const items = instances.map((name) => ({
    name,
    callback: () => handleSelect(name),
  }));

  renderDropdown({
    trigger: instanceBtn,
    items,
  });

  // Preselect 1st instance on initial mount
  handleSelect(instances[0]);
}

// Initialize and load RunModal
async function loadRunModal() {
  RunModal.init();

  const runsContainer = document.getElementById("recent-runs-body");

  runsContainer.addEventListener("click", async (e) => {
    const row = e.target.closest(".recent-runs-row");
    if (!row) return;

    const runId = Number(row.dataset.runId);
    const currentInstance =
      document.getElementById("instance-btn")?.dataset.value;

    try {
      const [runData, instanceSplitsData] = await Promise.all([
        fetchRunById(runId),
        fetchSplitsStats(currentInstance),
      ]);

      let pbRunId = instanceSplitsData.overall?.pb_run_id;
      let pbRunData;

      if (runId === pbRunId) {
        const beforeDate = runData.date;
        const secondFastest = await fetch2ndFastestBeforePB(
          runData.instance,
          beforeDate,
        );

        pbRunId = secondFastest[0].id;
        pbRunData = pbRunId ? await fetchRunById(pbRunId) : null;
      } else {
        pbRunData = pbRunId ? await fetchRunById(pbRunId) : null;
      }

      RunModal.open(runData, instanceSplitsData, pbRunData);
    } catch (err) {
      console.error("Failed to load run details:", err);
    }
  });
}

async function initApp() {
  const res = await fetch("/api/config");
  const config = await res.json();
  const instances = Object.keys(config.instances || {});

  // 2. Initialize dropdown and pass orchestrator trigger as callback
  renderInstanceDropdown(instances, (selectedInstance) => {
    loadDashboard(selectedInstance);
  });

  loadRunModal();
}

document.addEventListener("DOMContentLoaded", initApp);
