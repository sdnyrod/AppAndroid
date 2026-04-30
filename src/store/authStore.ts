import { create } from "zustand";
import { User, AuthState, LoginCredentials } from "@/types/auth";
import {
  login as apiLogin,
  getMe,
  logout as apiLogout,
  storeToken,
  removeToken,
  getStoredToken,
} from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_CACHE_KEY = "crew_user_cache";

interface AuthStore extends AuthState {
  mustChangePassword: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  mustChangePassword: false,

  login: async (credentials) => {
    try {
      const response = await apiLogin(credentials.email, credentials.password);

      if (!response.ok || !response.data) {
        return { success: false, error: response.error || "Invalid credentials" };
      }

      // Extract from tRPC response format
      const result = (response.data as any)?.result?.data?.json;
      if (!result?.success) {
        return { success: false, error: "Login failed" };
      }

      // Build user object from response
      const user: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role as User["role"],
        tenantId: null, // Will be populated from getMe
        tenantName: null,
        avatarUrl: null,
        phone: null,
        language: "en",
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        mustChangePassword: result.mustChangePassword || false,
      });

      // Fetch full user profile in background
      get().checkAuth();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout API errors
    }
    await removeToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      mustChangePassword: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });

    // Check if we have a stored token
    const token = await getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Load cached user immediately (offline-first)
    try {
      const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cachedUser) {
        const user = JSON.parse(cachedUser) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      }
    } catch {}

    // Then try to refresh from server
    try {
      const response = await getMe();
      if (response.ok && response.data) {
        const userData = (response.data as any)?.result?.data?.json;
        if (userData) {
          const user: User = {
            id: userData.id,
            email: userData.email || "",
            name: userData.name || "",
            role: userData.role || "worker",
            tenantId: userData.tenantId || null,
            tenantName: userData.tenantName || null,
            avatarUrl: userData.avatarUrl || null,
            phone: userData.phone || null,
            language: userData.language || "en",
            createdAt: userData.createdAt || new Date().toISOString(),
          };
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
          set({ user, token, isAuthenticated: true, isLoading: false });
        }
      } else if (response.status === 401) {
        // Token expired
        await removeToken();
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      // Network error — keep cached user (offline mode)
      if (!get().user) {
        set({ isLoading: false });
      }
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
