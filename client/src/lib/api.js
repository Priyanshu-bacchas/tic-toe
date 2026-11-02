// Production API URL works for both the hosted web app and the Android APK.
// Override with VITE_API_URL only if the API is moved to another host.
const API_BASE = (import.meta.env.VITE_API_URL || "https://tic-toe-eynw.onrender.com").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

export { API_BASE };
