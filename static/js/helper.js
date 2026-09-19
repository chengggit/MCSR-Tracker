/**
 * @param {number} ms
 * @returns {string}
 */
export function msToTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const miliseconds = ms % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(miliseconds).padStart(3, "0")}`;
}

/**
 * @param {number} unixTime
 * @returns {string} e.g. July, 6, 2026
 */
export function unixToDate(unixTime) {
  return new Date(unixTime).toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Takes an array of completed runs (sorted OLDEST to NEWEST)
 * and returns an array of rolling Avg5 values.
 * @param {Array} runs
 * @returns {Array<number|null>}
 * */
export function calculateRollingAvg5Series(runs) {
  return runs.map((_, index) => {
    if (index < 4) return null;

    // Grab the current run and 4 runs behind it
    const window = runs.slice(index - 4, index + 1);
    const sum = window.reduce((acc, curr) => acc + (curr.final_igt || 0), 0);

    return Math.round(sum / 5);
  });
}
