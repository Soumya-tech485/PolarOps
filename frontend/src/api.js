const API_URL = "http://127.0.0.1:8000";

export function getToken() {
  return localStorage.getItem("polarops_token");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("polarops_user"));
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("polarops_token");
  localStorage.removeItem("polarops_user");
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Login failed");
  }

  const data = await response.json();

  localStorage.setItem("polarops_token", data.access_token);
  localStorage.setItem("polarops_user", JSON.stringify({
    name: data.name,
    email: data.email,
    role: data.role
  }));

  return data;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return response.json();
}