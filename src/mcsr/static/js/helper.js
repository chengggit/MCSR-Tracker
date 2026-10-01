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
