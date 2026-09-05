import { msToTime, unixToDate } from "./helper.js";

const SPLIT_DISPLAY_NAMES = {
  enter_nether: "Nether Enter",
  nether_travel: "Nether Travel",
  enter_stronghold: "Stronghold",
  enter_end: "End Enter",
};

function normalizeSplits(rawSplits) {
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

  open(runData) {
    if (!this.element) return;

    if (runData) this.populate(runData);

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

  populate(runData) {
    document.getElementById("modal-banner-run").textContent =
      runData.world_name;
    document.getElementById("modal-banner-instance").textContent =
      `${runData.instance} (${runData.mc_version})`;
    document.getElementById("modal-banner-date").textContent = unixToDate(
      runData.date,
    );
    document.getElementById("modal-banner-igt").textContent = msToTime(
      runData.final_igt,
    );
    document.getElementById("modal-banner-rta").textContent = msToTime(
      runData.final_rta,
    );

    const makeCell = (text, tooltipText = "") => {
      const cell = document.createElement("span");
      cell.className = "cell";

      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      cell.appendChild(textSpan);

      if (tooltipText) {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.textContent = tooltipText;
        cell.appendChild(tooltip);
      }

      return cell;
    };

    const splits = normalizeSplits(runData.timelines);

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];

      const prevIgt = i === 0 ? 0 : splits[i - 1].igt;
      const prevLabel = i === 0 ? "Start" : splits[i - 1].actualName;

      const segmentMs = split.igt - prevIgt;
      const tooltip = `${prevLabel} ➔ ${split.actualName}`;

      const row = document.querySelector(
        `.modal-splits-row[data-split="${split.name}"]`,
      );
      if (!row) continue;

      row.querySelectorAll(".cell").forEach((cell) => cell.remove());
      row.appendChild(makeCell(msToTime(split.igt)));
      row.appendChild(makeCell(msToTime(segmentMs), tooltip));
    }

    const endSplit = splits.find((s) => s.name === "enter_end");
    const completionRow = document.querySelector(
      `.modal-splits-row[data-split="completion"]`,
    );

    if (endSplit && completionRow) {
      const completionSegmentMs = runData.final_igt - endSplit.igt;
      const tooltip = "End Enter ➔ Finish";

      completionRow.querySelectorAll(".cell").forEach((cell) => cell.remove());
      completionRow.appendChild(makeCell(msToTime(runData.final_igt)));
      completionRow.appendChild(
        makeCell(msToTime(completionSegmentMs), tooltip),
      );
    }
  },
};
