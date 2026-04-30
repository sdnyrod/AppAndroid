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

// --- API Client ---

interface ApiResponse<T = unknown> {
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

    const data = await response.json();

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
// The web backend uses tRPC with superjson serialization

export async function trpcQuery<T>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  const params = input
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";

  return apiRequest<T>(`/api/trpc/${procedure}${params}`, {
    method: "GET",
  });
}

export async function trpcMutation<T>(
  procedure: string,
  input?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(`/api/trpc/${procedure}`, {
    method: "POST",
    body: JSON.stringify(input !== undefined ? { json: input } : {}),
  });
}

// --- Auth Endpoints ---

/**
 * Login for tenant users (workers, admins, supervisors, salespeople, directors)
 * Uses the localLogin procedure from the web backend
 */
export async function login(email: string, password: string, tenantId?: number) {
  // Try tenant login first (most common case)
  const response = await trpcMutation<{
    result: {
      data: {
        json: {
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
        };
      };
    };
  }>("auth.localLogin", {
    email,
    password,
    loginType: "tenant",
    ...(tenantId ? { tenantId } : {}),
  });

  return response;
}

/**
 * Get current authenticated user info
 */
export async function getMe() {
  return trpcQuery("auth.me");
}

/**
 * Logout - clears session
 */
export async function logout() {
  const result = await trpcMutation("auth.logout");
  await removeToken();
  return result;
}

export { apiRequest };
