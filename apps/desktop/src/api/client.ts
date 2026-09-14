// Every module's API calls should go through this. Requests go to the
// relative path `/api/...`, which Vite's dev server proxies to the Spring
// Boot backend on :8787 (see vite.config.ts) — so there's one place to
// change later if the backend ever moves from a local subprocess to a
// hosted instance for the sync milestone, and the frontend never needs to
// know the backend's port during local dev.
const BASE_URL = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      // response body already consumed or unreadable — fall back to status only
    }
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = { request };
