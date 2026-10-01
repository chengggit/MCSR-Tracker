import { msToTime } from "./helper.js";

Chart.defaults.font.family = "JetBrains Mono";

/* --- Plugins --- */
const HOVER_GRID_PLUGIN = {
  id: "hoverGrid",
  afterDraw(chart) {
    const xScale = chart.scales.x;
    const { ctx, chartArea } = chart;
    const active = chart.getActiveElements();

    if (active.length === 0) return;

    const index = active[0].index;
    const tick = xScale.getTicks()[index];
    if (!tick) return;

    const x = xScale.getPixelForValue(tick.value);

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "#FFFFFF";
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

const ACTIVITY_HIGHLIGHT_PLUGIN = {
  id: "activityHighlight",
  beforeDraw(chart) {
    const { ctx, chartArea } = chart;
    const active = chart.getActiveElements();

    if (active.length === 0) return;

    const index = active[0].index;
    const colWidth = chartArea.width / chart.data.labels.length;
    const left = chartArea.left + index * colWidth;

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(
      left,
      chartArea.top,
      colWidth,
      chartArea.bottom - chartArea.top,
    );
    ctx.restore();
  },
};

// Plugin to add bottom margin below the legend
const LEGEND_MARGIN_PLUGIN = {
  id: "legendMargin",
  beforeInit(chart) {
    const originalFit = chart.legend.fit;
    chart.legend.fit = function fit() {
      originalFit.bind(this)();
      this.height += 16;
    };
  },
};

/* --- Utils --- */

/**
 * Creates a background gradient for chart datasets.
 * @param {import('chart.js').ScriptableContext<'line'>} context
 * @param {Array<[number, string]>} colorStops - Array of tuple pairs: [offset, color]
 * @param {number} [heightFactor=0.9] - Fraction of chart height for gradient
 * @returns {CanvasGradient | null}
 */
function createVerticalGradient(context, colorStops, heightFactor = 0.9) {
  const chart = context.chart;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return null;
  }

  const gradientHeight =
    chartArea.top + (chartArea.bottom - chartArea.top) * heightFactor;
  const gradient = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    gradientHeight,
  );

  for (const [offset, color] of colorStops) {
    gradient.addColorStop(offset, color);
  }

  return gradient;
}

/**
 * Render a line chart.
 * @param {HTMLCanvasElement} canvasElement
 * @param {Array<string>} labels - Array of x-axis labels
 * @param {Array<import('chart.js').ChartDataset>} datasets - Array of dataset configurations
 * @param {import('chart.js').ChartOptions} [options]
 * @returns {import('chart.js').Chart}
 */
function lineChart(canvasElement, labels, datasets, options = {}) {
  const ctx = canvasElement.getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: options,
    plugins: [HOVER_GRID_PLUGIN],
  });
}

/**
 * Render a line chart.
 * @param {HTMLCanvasElement} canvasElement
 * @param {Array<string>} labels - Array of x-axis labels
 * @param {Array<import('chart.js').ChartDataset>} datasets - Array of dataset configurations
 * @param {import('chart.js').ChartOptions} [options]
 * @returns {import('chart.js').Chart}
 */
function activityChart(canvasElement, labels, datasets, options = {}) {
  const ctx = canvasElement.getContext("2d");

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: datasets,
    },
    options: options,
    plugins: [ACTIVITY_HIGHLIGHT_PLUGIN, LEGEND_MARGIN_PLUGIN],
  });
}

/**
 * Get the current CSS theme variables with fallback values.
 * @returns {{ primary: string, muted: string, border: string, primaryFG: string, mutedFG: string, popover: string }}
 */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);

  return {
    primary: style.getPropertyValue("--chart-1").trim() || "#3bd16f",
    muted: style.getPropertyValue("--chart-3").trim() || "#1e2e1e",
    border:
      style.getPropertyValue("--border").trim() || "rgba(90, 158, 47, 0.18)",
    primaryFG: style.getPropertyValue("--foreground").trim() || "#d4e8c2",
    mutedFG: style.getPropertyValue("--muted-foreground").trim() || "#6a8a5a",
    popover: style.getPropertyValue("--popover").trim() || "#111911",
  };
}

/**
 * Get a base options and styling for chart
 * @returns {import('chart.js').ChartOptions}
 */
function getBaseChartOptions() {
  const colors = getThemeColors();

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        ticks: { color: colors.mutedFG },
        border: { dash: [4, 4] },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.mutedFG,
          maxTicksLimit: 5,
          callback: (value) => msToTime(value).split(".")[0],
        },
        grace: "25%",
        border: { dash: [4, 4] },
        grid: {
          color: colors.border,
          drawTicks: false,
          lineWidth: 0.5,
        },
      },
    },
    plugins: {
      tooltip: {
        displayColors: false,
        titleColor: colors.mutedFG,
        bodyColor: colors.primary,
        backgroundColor: colors.popover,
        borderColor: colors.border,
        caretSize: 0,
        borderWidth: 1,
        cornerRadius: 0,
        multiKeyBackground: "transparent",
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            const formattedTime = msToTime(context.parsed.y);
            return `${label} ${formattedTime}`;
          },
        },
      },
      legend: { display: false },
    },
  };
}

/* --- Helpers ---*/

let performanceChartInstance = null;
export function renderPerformanceChart(runs) {
  const ao5Element = document.getElementById("current-ao5");
  const canvas = document.getElementById("performance-chart");
  if (!canvas) return;

  if (performanceChartInstance) performanceChartInstance.destroy();

  // 5 completed runs required
  const latest5Runs = runs.slice(0, 5);
  if (latest5Runs.length === 5) {
    const avgMs = Math.round(
      latest5Runs.reduce((sum, run) => sum + run.final_igt, 0) / 5,
    );
    if (ao5Element) ao5Element.textContent = msToTime(avgMs).split(".")[0];
  } else if (ao5Element) {
    ao5Element.textContent = "-";
  }

  // Reverse from descending to ascending so the chart go from oldest -> newest
  const runsASC = runs.reverse();

  const rawTimes = runsASC.map((run) => run.final_igt);
  const labels = runsASC.map((run) => {
    const match = run.world_name?.match(/#\d+/);
    return match ? match[0] : run.world_name; // Fallback to full name if no '#' exists
  });

  const greenGradient = [
    [0, "rgba(59, 209, 111, 0.35)"],
    [0.6, "rgba(59, 209, 111, 0.1)"],
    [1, "rgba(59, 209, 111, 0.0)"],
  ];

  const colors = getThemeColors();

  const datasets = [
    {
      data: rawTimes,
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

  const options = getBaseChartOptions();
  options.scales.x.ticks.maxRotation = 0;

  options.plugins.tooltip.callbacks = {
    title: (tooltipItems) => {
      const index = tooltipItems[0].dataIndex;
      return runsASC[index]?.world_name || `Run #${index + 1}`;
    },
    label: (context) => msToTime(context.parsed.y),
  };

  performanceChartInstance = lineChart(canvas, labels, datasets, options);
}

let modalChartInstance = null;
export function renderModalChart(runSplits, pbSplits) {
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
    "Structure 1",
    "Structure 2",
    "Blind",
    "Stronghold",
    "End Enter",
    "Completion",
  ];

  const datasets = [
    {
      label: "This Run",
      data: runSplits,
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
      label: "PB Run",
      data: pbSplits,
      borderColor: colors.muted,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 3,
      pointBackgroundColor: colors.muted,
      tension: 0.2,
    },
  ];
  const options = getBaseChartOptions();

  options.plugins.tooltip.callbacks = {
    label: (context) => {
      const label = context.dataset.label || "";
      const formattedTime = msToTime(context.parsed.y);
      return `${label}: ${formattedTime}`;
    },
    labelTextColor: (context) => {
      return context.datasetIndex === 1 ? colors.mutedFG : colors.primary;
    },
  };

  modalChartInstance = lineChart(canvas, labels, datasets, options);
}

let activityChartInstance = null;
export function renderMonthlyActivity(data) {
  if (activityChartInstance) activityChartInstance.destroy();

  const { monthly, yearly_attempts, yearly_completions } = data;

  const attemptsElement = document.getElementById("yearly_attempts");
  const completionsElement = document.getElementById("yearly_completions");

  if (attemptsElement && yearly_attempts !== undefined) {
    attemptsElement.textContent = `${yearly_attempts} runs this year`;
  }

  if (completionsElement && yearly_completions !== undefined) {
    completionsElement.textContent = `${yearly_completions} completions`;
  }

  const canvas = document.getElementById("activity-chart");
  if (!canvas) return;

  const colors = getThemeColors();

  // format to 3-letter month shorthand
  const labels = monthly.map((m) =>
    new Date(m.month_start + "T00:00:00").toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
  );
  const datasets = [
    {
      label: "Attempts",
      data: monthly.map((m) => m.total),
      backgroundColor: colors.muted,
      borderWidth: 0,
    },
    {
      label: "Completions",
      data: monthly.map((m) => m.completions),
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
  ];

  const options = getBaseChartOptions();
  options.maintainAspectRatio = true;
  options.plugins.legend = {
    display: true,
    align: "start",
    labels: {
      boxWidth: 10,
      boxHeight: 10,
      usePointStyle: true,
      pointStyle: "rect",

      // Custom text colors per legend label
      generateLabels: (chart) => {
        const labels =
          Chart.defaults.plugins.legend.labels.generateLabels(chart);
        return labels.map((item) => {
          item.fontColor =
            item.datasetIndex === 1 ? colors.primaryFG : colors.mutedFG;
          return item;
        });
      },
    },
  };

  // Override the default formatting for y axis
  options.scales.y.ticks.callback = undefined;

  options.plugins.tooltip.bodyColor = colors.mutedFG;

  options.plugins.tooltip.callbacks = {
    label: (context) => {
      const label = context.dataset.label || "";
      return `${label}: ${context.parsed.y}`; // raw number instead of 1,000
    },
    labelTextColor: (context) => {
      return context.datasetIndex === 1 ? colors.primary : colors.mutedFG;
    },
  };
  activityChartInstance = activityChart(canvas, labels, datasets, options);
}
