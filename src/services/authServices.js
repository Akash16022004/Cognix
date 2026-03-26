import { API_URL } from '../config';

async function requestAuth(endpoint, data) {
  const payload = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? "http://localhost:5000" : (API_URL || "");
  const route = `/api/auth/${endpoint}`;

  try {
    const res = await fetch(`${baseUrl}${route}`, payload);
    
    if (res.status === 404) {
      // Try fallback route variant if /api/auth/ failed
      const fallbackRes = await fetch(`${baseUrl}/api/${endpoint}`, payload);
      if (fallbackRes.ok || fallbackRes.status !== 404) {
        return fallbackRes.json();
      }
    }

    if (!res.ok && res.status !== 401 && res.status !== 400) {
       console.error(`Auth Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (err) {
    console.error("Connection error to backend:", err);
    throw new Error("Unable to connect to the authentication server. Please check your internet or try again later.");
  }
}

export const signupUser = async (data) => {
  return requestAuth("signup", data);
};

export const loginUser = async (data) => {
  return requestAuth("login", data);
};