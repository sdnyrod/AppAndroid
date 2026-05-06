import { API_BASE_URL } from "@/constants/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "crew_auth_token";

// --- In-Memory Token Cache ---
// CRITICAL: iOS SecureStore has async latency. After storeToken(), a subsequent
// getStoredToken() may return null if the keychain write hasn't flushed yet.
// We keep an in-memory copy that is ALWAYS up-to-date and use it as primary source.
let _memoryToken: string | null = null;

// --- Token Management ---

export async function getStoredToken(): Promise<string | null> {
  // Memory cache is the primary source (always in sync)
  if (_memoryToken) return _memoryToken;

  // Fallback: read from SecureStore (e.g., on app cold start)
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) {
      _memoryToken = stored; // Sync memory cache
    }
    return stored;
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  // IMMEDIATELY set in-memory so subsequent requests can use it
  _memoryToken = token;

  // Persist to SecureStore in background (for app restarts)
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.error("[Auth] Failed to persist token to SecureStore:", e);
    // Token is still in memory — app will work for this session
  }
}

export async function removeToken(): Promise<void> {
  _memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore - token may not exist
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
  // Use memory token first, then SecureStore as fallback
  const token = _memoryToken || (await getStoredToken());

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Send token as Cookie header — this is how the backend validates sessions
  if (token) {
    headers["Cookie"] = `app_session_id=${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      // Do NOT use credentials: "include" on React Native — it causes issues
      // We handle cookies manually via the Cookie header above
    });

    // Attempt to extract set-cookie (works on Android, usually blocked on iOS)
    // This is a secondary fallback — primary token capture is from response body in login()
    try {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/app_session_id=([^;]+)/);
        if (match && match[1]) {
          await storeToken(match[1]);
        }
      }
    } catch {
      // Silently ignore — iOS blocks Set-Cookie header access
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

/**
 * Call a tRPC query (GET request)
 * Returns the unwrapped result data from the tRPC response envelope
 */
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

  // Unwrap tRPC response envelope: { result: { data: { json: ... } } }
  if (response.ok && response.data?.result?.data?.json !== undefined) {
    return { ...response, data: response.data.result.data.json };
  }
  return response as ApiResponse<T>;
}

/**
 * Call a tRPC mutation (POST request)
 * Returns the unwrapped result data from the tRPC response envelope
 */
export async function trpcMutation<T = any>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const response = await apiRequest<any>(`/api/trpc/${procedure}`, {
    method: "POST",
    body: JSON.stringify(input !== undefined ? { json: input } : {}),
  });

  // Unwrap tRPC response envelope
  if (response.ok && response.data?.result?.data?.json !== undefined) {
    return { ...response, data: response.data.result.data.json };
  }
  return response as ApiResponse<T>;
}

// --- Convenience API Client (used by screens) ---

/**
 * apiClient provides a simple interface for screens to call tRPC procedures.
 * Matches the pattern used throughout the app screens.
 */
export const apiClient = {
  query: trpcQuery,
  mutation: trpcMutation,

  // Shorthand for common patterns
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
 * CRITICAL: The backend returns the JWT token in the response BODY (not just Set-Cookie)
 * because React Native on iOS cannot read Set-Cookie headers.
 * We extract and store the token BOTH in memory AND SecureStore before returning.
 * The in-memory token guarantees the immediate getMe() call will have auth.
 */
export async function login(email: string, password: string, tenantId?: number) {
  const response = await trpcMutation<{
    success: boolean;
    mustChangePassword: boolean;
    isSalesperson: boolean;
    salespersonRank: string | null;
    token: string; // JWT token returned in body for mobile apps
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

  // CRITICAL: Extract token from response body and persist it
  // storeToken() sets _memoryToken IMMEDIATELY (synchronous assignment)
  // then persists to SecureStore asynchronously
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
