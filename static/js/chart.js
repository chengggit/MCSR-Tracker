const primaryColor =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--chart-1")
    .trim() || "#3bd16f";

const mutedColor =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--chart-3")
    .trim() || "#1e2e1e";

const borderColor =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--border")
    .trim() || "rgba(90, 158, 47, 0.18)";

const mutedFG =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--muted-foreground")
    .trim() || "#6a8a5a";

const popover =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--popover")
    .trim() || "#111911";

Chart.defaults.font.family = "JetBrains Mono";
Chart.defaults.color = mutedFG;

const RAData = [13, 12.3, 11.8, 11, 11.9, 10, 10.1, 11.1, 9.9, 9.6, 10.1];

const hoverGridPlugin = {
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

export function progressChart() {
  const ctx = document.getElementById("progress-chart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      datasets: [
        {
          data: RAData,
          borderColor: primaryColor,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 3,
          pointBackgroundColor: primaryColor,
          tension: 0.2,
          fill: true,
          backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;

            if (!chartArea) {
              return null;
            }

            const gradientHeight =
              chartArea.top + (chartArea.bottom - chartArea.top) * 0.9;

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              gradientHeight,
            );

            gradient.addColorStop(0, "rgba(59, 209, 111, 0.35)");
            gradient.addColorStop(0.6, "rgba(59, 209, 111, 0.1)");
            gradient.addColorStop(1, "rgba(59, 209, 111, 0.0)");

            return gradient;
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
        axis: "x",
      },

      scales: {
        x: {
          border: {
            dash: [4, 4],
          },
          grid: {
            color: borderColor,
            drawTicks: false,
            lineWidth: 0.5,
          },
        },
        y: {
          grace: "25%",
          border: {
            dash: [4, 4],
          },
          grid: {
            color: borderColor,
            drawTicks: false,
            lineWidth: 0.5,
          },
        },
      },

      plugins: {
        tooltip: {
          caretSize: 0,
          titleColor: mutedFG,
          bodyColor: primaryColor,
          backgroundColor: popover,
          borderColor: borderColor,
          borderWidth: 1,
          cornerRadius: 0,
        },
        legend: {
          display: false,
        },
      },
    },
    plugins: [hoverGridPlugin],
  });
}

const activityHighlightPlugin = {
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

let activityChart = null;

export function renderActivityChart(mode, data) {
  if (activityChart) activityChart.destroy();

  let labels, totals, completions;

  if (mode === "weekly") {
    const weekly = data.slice(-7);
    labels = weekly.map((d) =>
      new Date(d.day_start).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
    totals = weekly.map((d) => d.total);
    completions = weekly.map((d) => d.completed);
  } else {
    const months = {};
    for (const d of data) {
      const date = new Date(d.day_start);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months[key]) {
        months[key] = {
          label: date.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          }),
          total: 0,
          completed: 0,
        };
      }
      months[key].total += d.total;
      months[key].completed += d.completed;
    }
    labels = Object.values(months).map((m) => m.label);
    totals = Object.values(months).map((m) => m.total);
    completions = Object.values(months).map((m) => m.completed);
  }

  const ctx = document.getElementById("activity-chart").getContext("2d");

  activityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Attempts",
          data: totals,
          backgroundColor: mutedColor,
          borderWidth: 0,
        },
        {
          label: "Finished Run",
          data: completions,
          backgroundColor: primaryColor,
          borderWidth: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          border: {
            dash: [4, 4],
          },
          grid: {
            color: borderColor,
            drawTicks: false,
            lineWidth: 0.5,
          },
        },
        y: {
          border: {
            dash: [4, 4],
          },
          grid: {
            color: borderColor,
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
          titleColor: mutedFG,
          bodyColor: mutedFG,
          backgroundColor: popover,
          borderColor: borderColor,
          borderWidth: 1,
          cornerRadius: 0,
        },
      },
    },
    plugins: [activityHighlightPlugin],
  });
}
