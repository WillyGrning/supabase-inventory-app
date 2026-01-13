// API client dengan auth header otomatis
export async function apiClient(endpoint, options = {}) {
  const token = sessionStorage.getItem("session");
  
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`/api${endpoint}`, config);
  
  if (response.status === 401) {
    // Token expired, redirect to login
    sessionStorage.clear();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}