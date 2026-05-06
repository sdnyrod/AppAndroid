import { API_BASE_URL } from "@/constants/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "crew_auth_token";

// =============================================================================
// IN-MEMORY TOKEN CACHE
// =============================================================================
// CRITICAL DESIGN DECISION:
// iOS SecureStore (Keychain) has unpredictable async latency. After setItemAsync(),
// a subsequent getItemAsync() can return null if the keychain write hasn't flushed.
// 
// SOLUTION: _memoryToken is the SINGLE SOURCE OF TRUTH for the current session.
// SecureStore is ONLY used for persistence across app restarts (cold start recovery).
// 
// Flow:
//   storeToken(t) → _memoryToken = t (instant) + SecureStore.setItemAsync(t) (background)
//   getStoredToken() → returns _memoryToken || SecureStore.getItemAsync() (cold start only)
//   removeToken() → _memoryToken = null + SecureStore.deleteItemAsync()
// =============================================================================
let _memoryToken: string | null = null;

// --- Token Management ---

export async function getStoredToken(): Promise<string | null> {
  // In-memory is always authoritative during a session
  if (_memoryToken) return _memoryToken;

  // Cold start: read from SecureStore and hydrate memory
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) {
      _memoryToken = stored;
    }
    return stored;
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  // SYNCHRONOUS assignment — immediately available for next request
  _memoryToken = token;

  // Async persistence for cold start recovery
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    // Token is in memory — session will work. Log for diagnostics only.
    console.warn("[Auth] SecureStore persist failed (session unaffected):", e);
  }
}

export async function removeToken(): Promise<void> {
  _memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore — token may not exist in SecureStore
  }
}

// --- Core API Request ---

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // _memoryToken is checked first (zero-latency), SecureStore only on cold start
  const token = _memoryToken || (await getStoredToken());

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Backend validates via Cookie header
  if (token) {
    headers["Cookie"] = `app_session_id=${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Secondary token capture from Set-Cookie (Android only — iOS blocks this)
    try {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/app_session_id=([^;]+)/);
        if (match && match[1]) {
          await storeToken(match[1]);
        }
      }
    } catch {
      // Expected on iOS — silently ignore
    }

    if (response.status === 401) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      return {
        ok: false,
        error: data?.error?.json?.message || data?.error?.message || data?.message || "Request failed",
        status: response.status,
      };
    }

    return { ok: true, data, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

// --- tRPC Client ---

export async function trpcQuery<T = any>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const params = input
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";

  const response = await apiRequest<any>(`/api/trpc/${procedure}${params}`, {
    method: "GET",
  });

  // Unwrap tRPC envelope: { result: { data: { json: ... } } }
  if (response.ok && response.data?.result?.data?.json !== undefined) {
    return { ...response, data: response.data.result.data.json };
  }
  return response as ApiResponse<T>;
}

export async function trpcMutation<T = any>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const response = await apiRequest<any>(`/api/trpc/${procedure}`, {
    method: "POST",
    body: JSON.stringify(input !== undefined ? { json: input } : {}),
  });

  // Unwrap tRPC envelope
  if (response.ok && response.data?.result?.data?.json !== undefined) {
    return { ...response, data: response.data.result.data.json };
  }
  return response as ApiResponse<T>;
}

// --- Convenience API Client ---

export const apiClient = {
  query: trpcQuery,
  mutation: trpcMutation,

  async get<T = any>(procedure: string, input?: unknown): Promise<T | null> {
    const res = await trpcQuery<T>(procedure, input);
    return res.ok ? (res.data ?? null) : null;
  },

  async post<T = any>(procedure: string, input?: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
    const res = await trpcMutation<T>(procedure, input);
    return { ok: res.ok, data: res.data, error: res.error };
  },
};

// --- Auth Endpoints ---

/**
 * Login via local auth (email + password).
 * 
 * DEFINITIVE DESIGN:
 * The backend returns { success, token, user } in the response body.
 * storeToken() sets _memoryToken SYNCHRONOUSLY (instant) then persists async.
 * The caller (authStore) uses response.data.user directly — NO getMe() needed.
 * This guarantees login works on iOS regardless of SecureStore timing.
 */
export async function login(email: string, password: string, tenantId?: number) {
  const response = await trpcMutation<{
    success: boolean;
    mustChangePassword: boolean;
    isSalesperson: boolean;
    salespersonRank: string | null;
    token: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
    };
  }>("auth.localLogin", {
    email,
    password,
    loginType: "tenant",
    ...(tenantId ? { tenantId } : {}),
  });

  // Store token: _memoryToken set instantly, SecureStore persisted async
  if (response.ok && response.data?.token) {
    await storeToken(response.data.token);
  }

  return response;
}

export async function getMe() {
  return trpcQuery("auth.me");
}

export async function logout() {
  const result = await trpcMutation("auth.logout");
  await removeToken();
  return result;
}

export { apiRequest };
