const API_BASE = "/api";

async function apiFetch(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API Error [${response.status}]: ${response.statusText}`);
  }

  return response.json();
}

export const fetchRecentRuns = (limit = 8) => apiFetch(`/runs?limit=${limit}`);
export const fetchRunById = (runId) => apiFetch(`/runs/${runId}`);
export const fetchDashboardStats = () => apiFetch("/stats/dashboard");
export const fetchSplitsStats = () => apiFetch("/stats/splits");
export const fetchMonthlyActivity = () => apiFetch("/activity/monthly");
