/**
 * Frontend ↔ n8n webhook client.
 *
 * Uses app config defaults for the n8n webhook URL and API key.
 * Attaches `x-api-key` on every request and forwards the local session user
 * whenever a session is present in localStorage. On 401 the session is cleared
 * and the browser is redirected to /login.
 */

import { APP_CONFIG } from "@/config";

const SESSION_KEY = "nc_session";

interface StoredSession {
  session_token: string;
  user: { id: string; name: string; role: string };
  expires_at?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getBaseUrl(): string {
  return APP_CONFIG.n8nBaseUrl.replace(/\/$/, "");
}

function getApiKey(): string {
  return APP_CONFIG.n8nApiKey;
}

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(s: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "x-api-key": getApiKey(),
  };
  if (body !== undefined) headers["content-type"] = "application/json";

  const session = readSession();
  if (session?.session_token) headers["x-session-token"] = session.session_token;
  if (session?.user) {
    headers["x-user-id"] = session.user.id;
    headers["x-user-name"] = session.user.name;
    headers["x-user-role"] = session.user.role;
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (res.status === 401) {
    const err = (payload ?? {}) as { error?: string; code?: string };
    const code = err.code || "unauthorized";
    const shouldClearSession = [
      "session_invalid",
      "session_missing",
      "session_expired",
      "unauthorized",
    ].includes(code);

    if (shouldClearSession) {
      clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        const here = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(here)}`;
      }
    }

    throw new ApiError(err.error || "Session expirée", 401, code);
  }

  if (!res.ok) {
    const err = (payload ?? {}) as { error?: string; code?: string };
    throw new ApiError(err.error || `HTTP ${res.status}`, res.status, err.code);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export const SESSION_STORAGE_KEY = SESSION_KEY;
