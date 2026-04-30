import { API_BASE_URL } from "@/constants/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "crew_auth_token";

// --- Token Management ---

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Cookie"] = `app_session_id=${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Extract set-cookie header for token persistence
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/app_session_id=([^;]+)/);
      if (match) {
        await storeToken(match[1]);
      }
    }

    if (response.status === 401) {
      await removeToken();
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
        error: data?.error?.message || data?.message || "Request failed",
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

export async function login(email: string, password: string, tenantId?: number) {
  const response = await trpcMutation<{
    success: boolean;
    mustChangePassword: boolean;
    isSalesperson: boolean;
    salespersonRank: string | null;
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
