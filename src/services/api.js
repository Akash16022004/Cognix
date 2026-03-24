import { API_URL } from '../config';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

function getBaseUrls() {
  const preferred = import.meta.env.DEV ? 'http://localhost:5000' : API_URL;
  const fallback = import.meta.env.DEV ? API_URL : 'http://localhost:5000';
  return [preferred, fallback].filter(
    (value, index, arr) => arr.indexOf(value) === index,
  );
}

async function requestWithFallback(path, options = {}) {
  let lastResponse = null;
  let lastError = null;

  for (const baseUrl of getBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      if (response.status !== 404) {
        return response;
      }
      lastResponse = response;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError) throw lastError;
  throw new Error('No backend available.');
}

export async function generateNotes(url) {
  try {
    const response = await requestWithFallback('/api/generate-notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Include status code in error message for better debugging
      const errorMsg = data.error || `Server error: ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.secondsToWait = data.secondsToWait; // For cooldown errors
      throw error;
    }

    return data;
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Is it running on port 5000?');
    }
    throw err;
  }
}

export async function fetchLectures() {
  try {
    const response = await requestWithFallback('/api/lectures', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Error fetching lectures: ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Is it running on port 5000?');
    }
    throw err;
  }
}

export async function deleteLecture(id) {
  try {
    const response = await requestWithFallback(`/api/lectures/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Error deleting lecture: ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Is it running on port 5000?');
    }
    throw err;
  }
}
