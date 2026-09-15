import { fetchMonthlyActivity } from "./api.js";
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
    plugins: [ACTIVITY_HIGHLIGHT_PLUGIN],
  });
}

/**
 * Get the current CSS theme variables with fallback values.
 * @returns {{ primary: string, muted: string, border: string, mutedFG: string, popover: string }}
 */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);

  return {
    primary: style.getPropertyValue("--chart-1").trim() || "#3bd16f",
    muted: style.getPropertyValue("--chart-3").trim() || "#1e2e1e",
    border:
      style.getPropertyValue("--border").trim() || "rgba(90, 158, 47, 0.18)",
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
        titleColor: colors.mutedFG,
        bodyColor: colors.primary,
        backgroundColor: colors.popover,
        borderColor: colors.border,
        caretSize: 0,
        borderWidth: 1,
        cornerRadius: 0,
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

/* --- Renderers ---*/

let performanceChartInstance = null;
export function renderPerformanceChart() {
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

  performanceChartInstance = lineChart(
    canvas,
    labels,
    datasets,
    getBaseChartOptions(),
  );
}

let modalChartInstance = null;
export function renderModalChart(runData, pbData) {
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
      data: runData,
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
      data: pbData,
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

  modalChartInstance = lineChart(
    canvas,
    labels,
    datasets,
    getBaseChartOptions(),
  );
}

let activityChartInstance = null;
export async function renderActivityChart() {
  const months = await fetchMonthlyActivity();
  if (!months || !months.length) return;

  const canvas = document.getElementById("activity-chart");
  if (!canvas) return;

  if (activityChartInstance) activityChartInstance.destroy();

  const colors = getThemeColors();

  // format to 3-letter month shorthand
  const labels = months.map((m) =>
    new Date(m.month_start + "T00:00:00").toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
  );
  const datasets = [
    {
      label: "Attempts",
      data: months.map((m) => m.total),
      backgroundColor: colors.muted,
      borderWidth: 0,
    },
    {
      label: "Finished Run",
      data: months.map((m) => m.completed),
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
  ];

  const options = getBaseChartOptions();
  options.maintainAspectRatio = true;
  options.plugins.legend = {
    display: true,
    labels: { color: colors.mutedFG },
  };
  options.plugins.tooltip.bodyColor = colors.mutedFG;
  options.scales.y.ticks.callback = undefined;
  options.plugins.tooltip.callbacks = undefined;

  activityChartInstance = activityChart(canvas, labels, datasets, options);
}
