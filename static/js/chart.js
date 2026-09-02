Chart.defaults.font.family = "JetBrains Mono";

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

/**
 * Get the current CSS theme variables with fallback values.
 * @returns {{ primary: string, muted: string, border: string, mutedFG: string, popover: string }}
 */
export function getThemeColors() {
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
 * Creates a background gradient for chart datasets.
 * @param {import('chart.js').ScriptableContext<'line'>} context
 * @param {Array<[number, string]>} colorStops - Array of tuple pairs: [offset, color]
 * @param {number} [heightFactor=0.9] - Fraction of chart height for gradient
 * @returns {CanvasGradient | null}
 */
export function createVerticalGradient(
  context,
  colorStops,
  heightFactor = 0.9,
) {
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
export function lineChart(canvasElement, labels, datasets, options = {}) {
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
export function activityChart(canvasElement, labels, datasets, options = {}) {
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
