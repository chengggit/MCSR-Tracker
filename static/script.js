import {
  createVerticalGradient,
  getThemeColors,
  lineChart,
  renderActivityChart,
} from "./js/chart.js";

import {
  fetchRecentRuns,
  fetchSplitsStats,
  fetchRunsStats,
  fetchDashboardStats,
  fetchFinishRate,
} from "./js/api.js";

import {
  renderRecentRuns,
  renderSplitsStats,
  renderRunsStats,
  renderCards,
  renderDropdown,
} from "./js/dom.js";

let performanceChartInstance = null;
function renderPerformanceChart() {
  const canvas = document.getElementById("performance-chart");
  if (!canvas) return;

  if (performanceChartInstance) performanceChartInstance.destroy;

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

let dailyData = [];
fetchFinishRate()
  .then((data) => {
    if (!data) return;
    dailyData = data;
    renderActivityChart("monthly", dailyData);
  })
  .catch((err) => {
    console.error("Couldn't load finish rate:", err);
  });

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

const activityBtn = document.getElementById("activity-btn");
renderDropdown({
  trigger: activityBtn,
  items: [
    {
      name: "Monthly Activity",
      callback: () => renderActivityChart("monthly", dailyData),
    },
    {
      name: "Weekly Activity",
      callback: () => renderActivityChart("weekly", dailyData),
    },
  ],
});
