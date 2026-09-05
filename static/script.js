import {
  createVerticalGradient,
  getThemeColors,
  lineChart,
  activityChart,
} from "./js/chart.js";

import {
  fetchRecentRuns,
  fetchSplitsStats,
  fetchRunsStats,
  fetchDashboardStats,
  fetchMonthlyActivity,
} from "./js/api.js";

import {
  renderRecentRuns,
  renderSplitsStats,
  renderRunsStats,
  renderCards,
  renderDropdown,
} from "./js/dom.js";

import { RunModal } from "./js/modal.js";

let runData = {
  mc_version: "1.16.1",
  category: "ANY",
  run_type: "set_seed",
  is_completed: true,
  world_name: "Set Speedrun #3099",
  date: 1784542191514,
  retimed_igt: 572922,
  final_igt: 572922,
  final_rta: 593992,
  instance: "FSG",
  timelines: [
    {
      name: "enter_nether",
      igt: 84748,
      rta: 86041,
    },
    {
      name: "enter_bastion",
      igt: 84765,
      rta: 86485,
    },
    {
      name: "enter_fortress",
      igt: 280515,
      rta: 288540,
    },
    {
      name: "nether_travel",
      igt: 428415,
      rta: 436681,
    },
    {
      name: "enter_stronghold",
      igt: 483584,
      rta: 499688,
    },
    {
      name: "enter_end",
      igt: 514284,
      rta: 532630,
    },
    {
      name: "kill_ender_dragon",
      igt: 551389,
      rta: 572480,
    },
  ],
};
document.addEventListener("DOMContentLoaded", () => {
  RunModal.init();
  RunModal.open(runData);
});

let performanceChartInstance = null;
function renderPerformanceChart() {
  const canvas = document.getElementById("performance-chart");
  if (!canvas) return;

  if (performanceChartInstance) performanceChartInstance.destroy();

  const greenGradient = [
    [0, "rgba(59, 209, 111, 0.35)"],
    [0.6, "rgba(59, 209, 111, 0.1)"],
    [1, "rgba(59, 209, 111, 0.0)"],
  ];

  const colors = getThemeColors();

  const labels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const mockData = [13, 12.3, 11.8, 11, 11.9, 10, 10.1, 11.1, 9.9, 9.6, 10.1];
  const datasets = [
    {
      data: mockData,
      borderColor: colors.primary,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 3,
      pointBackgroundColor: colors.primary,
      tension: 0.2,
      fill: true,
      backgroundColor: (context) =>
        createVerticalGradient(context, greenGradient),
    },
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
      axis: "x",
    },

    scales: {
      x: {
        ticks: {
          color: colors.mutedFG,
        },
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
      y: {
        ticks: {
          color: colors.mutedFG,
        },
        grace: "25%",
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
    },

    plugins: {
      tooltip: {
        caretSize: 0,
        titleColor: colors.mutedFG,
        bodyColor: colors.primary,
        backgroundColor: colors.popover,
        borderColor: colors.border,
        borderWidth: 1,
        cornerRadius: 0,
      },
      legend: {
        display: false,
      },
    },
  };

  performanceChartInstance = lineChart(canvas, labels, datasets, options);
}

renderPerformanceChart();

let activityChartInstance = null;

async function renderActivityChart() {
  const months = await fetchMonthlyActivity();
  if (!months || !months.length) return;

  const canvas = document.getElementById("activity-chart");
  if (!canvas) return;

  // format to 3-letter month shorthand
  const labels = months.map((m) =>
    new Date(m.month_start + "T00:00:00").toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
  );

  const total = months.map((m) => m.total);
  const completions = months.map((m) => m.completed);

  if (activityChartInstance) activityChartInstance.destroy();

  const colors = getThemeColors();

  const datasets = [
    {
      label: "Attempts",
      data: total,
      backgroundColor: colors.muted,
      borderWidth: 0,
    },
    {
      label: "Finished Run",
      data: completions,
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
  ];

  const options = {
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        ticks: {
          color: colors.mutedFG,
        },
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
      y: {
        ticks: {
          color: colors.mutedFG,
        },
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
    },
    plugins: {
      tooltip: {
        mode: "index",
        intersect: false,
        caretSize: 0,
        titleColor: colors.mutedFG,
        bodyColor: colors.mutedFG,
        backgroundColor: colors.popover,
        borderColor: colors.border,
        borderWidth: 1,
        cornerRadius: 0,
      },
      legend: {
        labels: {
          color: colors.mutedFG,
        },
      },
    },
  };

  activityChartInstance = activityChart(canvas, labels, datasets, options);
}

renderActivityChart();

fetchRecentRuns()
  .then(renderRecentRuns)
  .catch((err) => {
    console.error("Couldn't load recent runs:", err);
  });

fetchSplitsStats()
  .then(renderSplitsStats)
  .catch((err) => {
    console.error("Couldn't load splits stats:", err);
  });

fetchRunsStats()
  .then(renderRunsStats)
  .catch((err) => {
    console.error("Couldn't load runs stats:", err);
  });

fetchDashboardStats()
  .then(renderCards)
  .catch((err) => {
    console.error("Couldn't load dashboard stats:", err);
  });

const instanceBtn = document.getElementById("instance-btn");
renderDropdown({
  trigger: instanceBtn,
  items: [
    {
      name: "RSG",
      callback: () => {},
    },
    {
      name: "FSG",
      callback: () => {},
    },
  ],
});

let modalChartInstance = null;
function renderModalChart() {
  const canvas = document.getElementById("modal-chart");
  if (!canvas) return;

  if (modalChartInstance) modalChartInstance.destroy();

  const greenGradient = [
    [0, "rgba(59, 209, 111, 0.35)"],
    [0.6, "rgba(59, 209, 111, 0.1)"],
    [1, "rgba(59, 209, 111, 0.0)"],
  ];

  const colors = getThemeColors();

  const labels = [
    "Nether",
    "Bastion",
    "Fortress",
    "Blind",
    "Stronghold",
    "End Enter",
    "Finish",
  ];

  const mockData = [1.5, 2.5, 5.2, 7.4, 8.6, 9, 10.1];
  const mockData2 = [1.4, 2.2, 4.5, 6.3, 7.5, 8.1, 9.2];

  const datasets = [
    {
      data: mockData,
      borderColor: colors.primary,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 3,
      pointBackgroundColor: colors.primary,
      tension: 0.2,
      fill: true,
      backgroundColor: (context) =>
        createVerticalGradient(context, greenGradient),
    },
    {
      data: mockData2,
      borderColor: colors.primary,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 3,
      pointBackgroundColor: colors.primary,
      tension: 0.2,
      fill: true,
      backgroundColor: (context) =>
        createVerticalGradient(context, greenGradient),
    },
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
      axis: "x",
    },

    scales: {
      x: {
        ticks: {
          color: colors.mutedFG,
        },
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
      y: {
        ticks: {
          color: colors.mutedFG,
        },
        grace: "25%",
        border: {
          dash: [4, 4],
        },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
    },

    plugins: {
      tooltip: {
        caretSize: 0,
        titleColor: colors.mutedFG,
        bodyColor: colors.primary,
        backgroundColor: colors.popover,
        borderColor: colors.border,
        borderWidth: 1,
        cornerRadius: 0,
      },
      legend: {
        display: false,
      },
    },
  };

  modalChartInstance = lineChart(canvas, labels, datasets, options);
}

renderModalChart();
