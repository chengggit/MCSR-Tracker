const API_BASE = "/api";

async function apiFetch(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API Error [${response.status}]: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch runs with flexible query parameters for GET /runs endpoint.
 * @param {Object} params - Query params (instance, run_type, version, completed, limit, offset, sort_by, order)
 */
function fetchRuns(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return apiFetch(`/runs${queryString ? `?${queryString}` : ""}`);
}

/* --- Helpers --- */
export const fetchRecentRuns = (limit = 8) => fetchRuns({ limit });
export const fetchRunById = (runId) => apiFetch(`/runs/${runId}`);
export const fetchDashboardStats = () => apiFetch("/stats/dashboard");
export const fetchSplitsStats = () => apiFetch("/stats/splits");
export const fetchMonthlyActivity = () => apiFetch("/activity/monthly");

export const fetchRecent12CompletedRuns = () => {
  return fetchRuns({
    completed: true,
    limit: 12,
  });
};
