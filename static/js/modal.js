import { msToTime, unixToDate } from "./helper.js";

const SPLIT_DISPLAY_NAMES = {
  enter_nether: "Nether Enter",
  nether_travel: "Nether Travel",
  enter_stronghold: "Stronghold",
  enter_end: "End Enter",
};

const SPLITS_FILTER = new Set([
  "enter_nether",
  "structure_1",
  "structure_2",
  "nether_travel",
  "enter_stronghold",
  "enter_end",
]);

function formatSplits(rawSplits) {
  if (!rawSplits || rawSplits.length === 0) return [];

  let structureIndex = 0;

  return rawSplits
    .filter((split) => split.name !== "kill_ender_dragon")
    .map((split) => {
      let rowName = split.name;
      let actualName = "";

      // Convert bastion/fortress to structure_1 / structure_2
      if (split.name === "enter_bastion" || split.name === "enter_fortress") {
        structureIndex++;
        rowName = `structure_${structureIndex}`;
        actualName = split.name === "enter_bastion" ? "Bastion" : "Fortress";
      } else {
        actualName = SPLIT_DISPLAY_NAMES[split.name] || split.name;
      }

      return {
        name: rowName, // Used for DOM query
        actualName: actualName, // Used for Tooltips
        igt: split.igt,
        rta: split.rta,
      };
    });
}

function formatDelta(ms) {
  const sign = ms <= 0 ? "-" : "+";
  return `${sign}${msToTime(Math.abs(ms))}`;
}

// class for dom
function deltaClass(deltaMs) {
  return deltaMs <= 0 ? "delta-ahead" : "delta-behind";
}

export const RunModal = {
  element: null,
  closeBtn: null,
  chartInstance: null,

  init() {
    this.element = document.getElementById("modal-container");
    this.closeBtn = document.getElementById("modal-close-btn");

    if (!this.element) return;

    this.closeBtn?.addEventListener("click", () => this.close());

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) this.close();
    });
  },

  open(runData, allSplitsData, pbData) {
    if (!this.element) return;

    if (runData) this.populate(runData, allSplitsData, pbData);

    this.element.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  close() {
    if (!this.element) return;

    this.element.classList.add("hidden");
    document.body.style.overflow = "";
  },

  isOpen() {
    return this.element && !this.element.classList.contains("hidden");
  },

  resetRows() {
    const columns = document.querySelectorAll(`
    .modal-splits-row .modal-col-igt,
    .modal-splits-row .modal-col-segment,
    .modal-splits-row .modal-col-avg,
    .modal-splits-row .modal-col-pb
    `);

    columns.forEach((col) => {
      col.textContent = "";
    });

    const colWithClass = document.querySelectorAll(
      `.modal-splits-row .modal-col-avg, .modal-splits-row .modal-col-pb`,
    );
    colWithClass.forEach((col) => {
      col.classList.remove("delta-ahead", "delta-behind");
    });
  },

  populate(runData, allSplitsData, pbData) {
    this.resetRows();

    document.getElementById("modal-banner-run").textContent =
      runData.world_name;
    document.getElementById("modal-banner-instance").textContent =
      `${runData.instance} (${runData.mc_version})`;
    document.getElementById("modal-banner-date").textContent = unixToDate(
      runData.date,
    );
    document.getElementById("modal-banner-igt").textContent =
      runData.is_completed ? msToTime(runData.final_igt) : "-";
    document.getElementById("modal-banner-rta").textContent =
      runData.is_completed ? msToTime(runData.final_rta) : "-";

    const splits = formatSplits(runData.timelines);
    const pbSplits = formatSplits(pbData.timelines);
    const allSplits = allSplitsData.filter((split) =>
      SPLITS_FILTER.has(split.name),
    );

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];

      const prevIgt = i === 0 ? 0 : splits[i - 1].igt;
      const prevLabel = i === 0 ? "Start" : splits[i - 1].actualName;

      const segmentMs = split.igt - prevIgt;
      const tooltipText = `${prevLabel} ➔ ${split.actualName}`;

      const avgDeltaMs = split.igt - allSplits[i].avg_igt;
      const pbDeltaMs = split.igt - pbSplits[i].igt;

      const row = document.querySelector(
        `.modal-splits-row[data-split="${split.name}"]`,
      );
      if (!row) continue;

      row.querySelector(".modal-col-igt").textContent = msToTime(split.igt);
      row.querySelector(".modal-col-segment").textContent = msToTime(segmentMs);
      row.querySelector(".modal-col-avg").textContent = formatDelta(avgDeltaMs);
      row.querySelector(".modal-col-pb").textContent = formatDelta(pbDeltaMs);

      row.querySelector(".modal-col-avg").classList.add(deltaClass(avgDeltaMs));
      row.querySelector(".modal-col-pb").classList.add(deltaClass(pbDeltaMs));

      if (split) {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.textContent = tooltipText;
        row.querySelector(".modal-col-segment").appendChild(tooltip);
      }
    }

    const endSplit = splits.find((s) => s.name === "enter_end");
    const completionRow = document.querySelector(
      `.modal-splits-row[data-split="completion"]`,
    );

    if (runData.is_completed === 1) {
      const completionSegmentMs = runData.final_igt - endSplit.igt;
      const completionAvgDeltaMs = runData.final_igt - pbData.final_igt; // THIS NEEDS TO BE FIXED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      const completionPbDeltaMs = runData.final_igt - pbData.final_igt;

      const tooltipText = "End Enter ➔ Finish";

      completionRow.querySelector(".modal-col-igt").textContent = msToTime(
        runData.final_igt,
      );
      completionRow.querySelector(".modal-col-segment").textContent =
        msToTime(completionSegmentMs);
      completionRow.querySelector(".modal-col-avg").textContent =
        formatDelta(completionAvgDeltaMs);
      completionRow.querySelector(".modal-col-pb").textContent =
        formatDelta(completionPbDeltaMs);

      completionRow
        .querySelector(".modal-col-avg")
        .classList.add(deltaClass(completionAvgDeltaMs));
      completionRow
        .querySelector(".modal-col-pb")
        .classList.add(deltaClass(completionPbDeltaMs));

      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = tooltipText;
      completionRow.querySelector(".modal-col-segment").appendChild(tooltip);
    }
  },
};
