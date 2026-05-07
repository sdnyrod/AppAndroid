import { API_BASE_URL } from "@/constants/config";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "crew_auth_token";
const TOKEN_ASYNC_KEY = "crew_auth_token_async";

// =============================================================================
// BULLETPROOF TOKEN MANAGEMENT
// =============================================================================
// ROOT CAUSE OF PREVIOUS BUG:
// Metro bundler can create multiple module instances of this file. A module-level
// variable (_memoryToken) set in one instance is invisible to another instance.
// This caused the token to be null when screens called apiRequest().
//
// DEFINITIVE SOLUTION:
// 1. Token is stored in TWO persistent locations: SecureStore + AsyncStorage
// 2. Every API request reads the token from AsyncStorage (fast, synchronous-like)
// 3. SecureStore is the authoritative backup (survives app reinstall on iOS)
// 4. NO module-level variable is used as the source of truth
// 5. storeToken() writes to BOTH stores before returning
// =============================================================================

/**
 * Store token in both SecureStore and AsyncStorage.
 * AsyncStorage is the fast-path for reads (no Keychain latency).
 * SecureStore is the secure backup for cold starts.
 */
export async function storeToken(token: string): Promise<void> {
  // Write to AsyncStorage FIRST (fastest read path for subsequent requests)
  try {
    await AsyncStorage.setItem(TOKEN_ASYNC_KEY, token);
  } catch (e: unknown) {
    console.warn("[Auth] AsyncStorage write failed:", e);
  }

  // Write to SecureStore (secure persistence)
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e: unknown) {
    console.warn("[Auth] SecureStore write failed:", e);
  }
}

/**
 * Retrieve token. Checks AsyncStorage first (fast), falls back to SecureStore.
 * Returns null only if token genuinely does not exist in either store.
 */
export async function getStoredToken(): Promise<string | null> {
  // Fast path: AsyncStorage
  try {
    const asyncToken = await AsyncStorage.getItem(TOKEN_ASYNC_KEY);
    if (asyncToken) {
      return asyncToken;
    }
  } catch (e: unknown) {
    console.warn("[Auth] AsyncStorage read failed:", e);
  }

  // Fallback: SecureStore (cold start after app reinstall)
  try {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secureToken) {
      // Hydrate AsyncStorage for future fast reads
      try {
        await AsyncStorage.setItem(TOKEN_ASYNC_KEY, secureToken);
      } catch {
        // Non-critical
      }
      return secureToken;
    }
  } catch (e: unknown) {
    console.warn("[Auth] SecureStore read failed:", e);
  }

  return null;
}

/**
 * Remove token from all stores. Called on logout.
 */
export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_ASYNC_KEY);
  } catch {
    // Ignore
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

// =============================================================================
// CORE API REQUEST
// =============================================================================

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Execute an HTTP request to the backend with automatic token injection.
 * Token is ALWAYS read from persistent storage — never from a module variable.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // ALWAYS read token from persistent store (eliminates module duplication bug)
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Backend authenticates via Cookie header with app_session_id
  if (token) {
    headers["Cookie"] = `app_session_id=${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "omit", // Prevent iOS from interfering with cookie handling
    });

    // Capture token from Set-Cookie if backend sends one (Android only)
    try {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/app_session_id=([^;]+)/);
        if (match && match[1] && match[1] !== "deleted") {
          await storeToken(match[1]);
        }
      }
    } catch {
      // Expected to fail on iOS — silently ignore
    }

    if (response.status === 401) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }

    const text = await response.text();
    let data: T | undefined;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }

    if (!response.ok) {
      const errorData = data as Record<string, unknown> | undefined;
      const errorMsg =
        (errorData as { error?: { json?: { message?: string }; message?: string }; message?: string })?.error?.json?.message ||
        (errorData as { error?: { message?: string } })?.error?.message ||
        (errorData as { message?: string })?.message ||
        "Request failed";
      return { ok: false, error: errorMsg, status: response.status };
    }

    return { ok: true, data, status: response.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, error: message, status: 0 };
  }
}

// =============================================================================
// tRPC CLIENT HELPERS
// =============================================================================

/**
 * Build superjson-compatible input encoding.
 * Detects Date instances in the input and adds the required `meta` field
 * so tRPC's superjson transformer deserializes them correctly.
 */
function buildSuperjsonInput(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return JSON.stringify({ json: input });
  }
  const json: Record<string, unknown> = {};
  const dateKeys: string[] = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value instanceof Date) {
      json[key] = value.toISOString();
      dateKeys.push(key);
    } else {
      json[key] = value;
    }
  }
  if (dateKeys.length === 0) {
    return JSON.stringify({ json: input });
  }
  const meta: Record<string, unknown> = { values: {} };
  for (const key of dateKeys) {
    (meta.values as Record<string, string[]>)[key] = ["Date"];
  }
  return JSON.stringify({ json, meta });
}

/**
 * Execute a tRPC query (GET request).
 * Unwraps the tRPC envelope: { result: { data: { json: ... } } }
 */
export async function trpcQuery<T = unknown>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const params = input
    ? `?input=${encodeURIComponent(buildSuperjsonInput(input))}`
    : "";

  const response = await apiRequest<Record<string, unknown>>(
    `/api/trpc/${procedure}${params}`,
    { method: "GET" }
  );

  // Unwrap tRPC envelope
  if (response.ok && response.data) {
    const result = response.data as { result?: { data?: { json?: T } } };
    if (result?.result?.data?.json !== undefined) {
      return { ...response, data: result.result.data.json };
    }
  }

  return response as ApiResponse<T>;
}

/**
 * Execute a tRPC mutation (POST request).
 * Unwraps the tRPC envelope: { result: { data: { json: ... } } }
 */
export async function trpcMutation<T = unknown>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const response = await apiRequest<Record<string, unknown>>(
    `/api/trpc/${procedure}`,
    {
      method: "POST",
      body: input !== undefined ? buildSuperjsonInput(input) : JSON.stringify({}),
    }
  );

  // Unwrap tRPC envelope
  if (response.ok && response.data) {
    const result = response.data as { result?: { data?: { json?: T } } };
    if (result?.result?.data?.json !== undefined) {
      return { ...response, data: result.result.data.json };
    }
  }

  return response as ApiResponse<T>;
}

// =============================================================================
// CONVENIENCE API CLIENT
// =============================================================================

export const apiClient = {
  query: trpcQuery,
  mutation: trpcMutation,

  /**
   * Shorthand for tRPC query that returns data directly or null on failure.
   */
  async get<T = unknown>(procedure: string, input?: unknown): Promise<T | null> {
    const res = await trpcQuery<T>(procedure, input);
    if (res.ok && res.data !== undefined) {
      return res.data;
    }
    return null;
  },

  /**
   * Shorthand for tRPC mutation that returns { ok, data, error }.
   */
  async post<T = unknown>(
    procedure: string,
    input?: unknown
  ): Promise<{ ok: boolean; data?: T; error?: string }> {
    const res = await trpcMutation<T>(procedure, input);
    return { ok: res.ok, data: res.data, error: res.error };
  },
};

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

interface LoginResponse {
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
}

/**
 * Login via local auth (email + password).
 *
 * FLOW:
 * 1. POST to auth.localLogin with credentials
 * 2. Backend returns { success, token, user } in response body
 * 3. storeToken() persists to AsyncStorage + SecureStore BEFORE returning
 * 4. Caller (authStore) uses response.data.user directly — NO getMe() needed
 */
export async function login(
  email: string,
  password: string,
  tenantId?: number
): Promise<ApiResponse<LoginResponse>> {
  const payload: Record<string, unknown> = {
    email,
    password,
    loginType: "tenant",
  };
  if (tenantId) {
    payload.tenantId = tenantId;
  }

  const response = await trpcMutation<LoginResponse>("auth.localLogin", payload);

  // Persist token IMMEDIATELY after successful login
  if (response.ok && response.data?.token) {
    await storeToken(response.data.token);
  }

  return response;
}

/**
 * Get current user profile. Used for token validation and profile enrichment.
 */
export async function getMe(): Promise<ApiResponse<unknown>> {
  return trpcQuery("auth.me");
}

/**
 * Logout: call backend then clear all stored tokens.
 */
export async function logout(): Promise<ApiResponse<unknown>> {
  const result = await trpcMutation("auth.logout");
  await removeToken();
  return result;
}

export { apiRequest };
