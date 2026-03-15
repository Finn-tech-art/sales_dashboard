const API_BASE = "/api";
const TOKEN_KEY = "bizard_leads_access_token";
const REFRESH_TOKEN_KEY = "bizard_leads_refresh_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function readErrorPayload(payload, responseStatus) {
  if (!payload) {
    return `Request Failed With ${responseStatus}`;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail) && payload.detail.length > 0) {
    return payload.detail.map((item) => item.msg || item.type || "Validation Error").join(", ");
  }
  return payload.message || `Request Failed With ${responseStatus}`;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (typeof showAppLoader === "function") {
    showAppLoader(options.loaderTitle || "Loading Workspace", options.loaderSubtitle || "Syncing Live Platform Data");
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      let payload = null;
      const rawBody = await response.text();
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        payload = { detail: rawBody };
      }
      const message = titleCase(readErrorPayload(payload, response.status));
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return response.text();
    }
    return response.json();
  } finally {
    if (typeof hideAppLoader === "function") {
      hideAppLoader();
    }
  }
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login.html";
  }
}

window.getToken = getToken;
window.setTokens = setTokens;
window.clearTokens = clearTokens;
window.apiFetch = apiFetch;
window.requireAuth = requireAuth;
