import { progressChart, renderActivityChart } from "./js/chart.js";

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

let dailyData = [];

progressChart();

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
