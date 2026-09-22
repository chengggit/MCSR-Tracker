/**
 * Generic column-vector table renderer.
 * @param {Object} config
 * @param {HTMLElement} config.container - Target element to inject rows into
 * @param {Object} [config.rowConfig] - Row styling & attributes configuration
 * @param {string} [config.rowConfig.className] - CSS class for each row
 * @param {Function} [config.rowConfig.getAttrs] - Function returning row attribute string for index i: (i) => string
 * @param {Array<Object>} config.columns - Array of column objects with pre-formatted `values` arrays
 */
export function renderTable({ container, rowConfig = {}, columns = [] }) {
  if (!container) return;

  // Determine row count from the first column's array length
  const rowCount = columns[0]?.values?.length ?? 0;

  if (rowCount === 0) {
    container.innerHTML = `<div class="empty-state">No data available</div>`;
    return;
  }

  const rowClass = rowConfig.className ? `class="${rowConfig.className}"` : "";

  // Build row HTML by looping through row index `i`
  const rowsHtml = Array.from({ length: rowCount }, (_, i) => {
    // Get row-level attributes for index i (e.g. data-run-id="12")
    const attrs =
      typeof rowConfig.getAttrs === "function" ? rowConfig.getAttrs(i) : "";

    // Build each cell in row i
    const cellsHtml = columns
      .map((col) => {
        const cellClass = col.className ? `cell ${col.className}` : "cell";
        const cellValue = col.values?.[i] ?? "N/A";

        return `<span class="${cellClass}">${cellValue}</span>`;
      })
      .join("");

    return `<div ${rowClass} ${attrs}>${cellsHtml}</div>`;
  }).join("");

  container.innerHTML = rowsHtml;
}
