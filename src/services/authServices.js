import { API_URL } from '../config';

async function requestAuth(endpoint, data) {
  const payload = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };

  const preferred = import.meta.env.DEV ? "http://localhost:5000" : API_URL;
  const fallback = import.meta.env.DEV ? API_URL : "http://localhost:5000";
  const baseUrls = [preferred, fallback].filter(
    (value, index, arr) => arr.indexOf(value) === index,
  );
  const routeVariants = [`/api/auth/${endpoint}`, `/api/${endpoint}`];

  let lastError = null;

  for (const baseUrl of baseUrls) {
    for (const route of routeVariants) {
      try {
        const res = await fetch(`${baseUrl}${route}`, payload);
        if (res.status !== 404) {
          return res.json();
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  return { error: "Auth routes not found on configured backend." };
}

export const signupUser = async (data) => {
  return requestAuth("signup", data);
};

export const loginUser = async (data) => {
  return requestAuth("login", data);
};