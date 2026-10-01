const API_BASE = "/api";

async function apiFetch(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API Error [${response.status}]: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to build query strings while ignoring null/undefined values
 */
function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Fetch runs with flexible query parameters for GET /runs endpoint.
 * @param {Object} params - Query params (instance, run_type, version, completed, date, before_date, after_date, limit, offset, sort_by, order)
 */
function fetchRuns(params = {}) {
  return apiFetch(`/runs${buildQuery(params)}`);
}

/* --- Helpers --- */
export const fetchRunById = (runId) => apiFetch(`/runs/${runId}`);

export const fetchRecentRuns = (instance = null, limit = 8) =>
  fetchRuns({ instance, limit });

export const fetchDashboardStats = (instance = null) =>
  apiFetch(`/stats/dashboard${buildQuery({ instance })}`);

export const fetchSplitsStats = (instance = null) =>
  apiFetch(`/stats/splits${buildQuery({ instance })}`);

export const fetchMonthlyActivity = (instance = null) =>
  apiFetch(`/activity/monthly${buildQuery({ instance })}`);

export const fetchRecent12CompletedRuns = (instance = null) =>
  fetchRuns({
    instance: instance,
    completed: true,
    limit: 12,
  });

export const fetch2ndFastestBeforePB = (instance = null, beforeDate = null) =>
  fetchRuns({
    instance: instance,
    completed: true,
    before_date: beforeDate,
    limit: 1,
    sort_by: "final_igt",
    order: "ASC",
  });
