const apiUrl = "http://127.0.0.1:8000/api";

export async function fetchRecentRuns() {
  try {
    const response = await fetch(`${apiUrl}/runs?limit=8`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(err);
  }
}

export async function fetchSplitsStats() {
  try {
    const response = await fetch(`${apiUrl}/splits/stats`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(err);
  }
}

export async function fetchRunsStats() {
  try {
    const response = await fetch(`${apiUrl}/runs/stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(err);
  }
}

export async function fetchMonthlyActivity() {
  try {
    const response = await fetch(`${apiUrl}/activity/monthly`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(err);
  }
}

export async function fetchDashboardStats() {
  try {
    const response = await fetch(`${apiUrl}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(err);
  }
}
