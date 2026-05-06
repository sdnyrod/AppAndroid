import { create } from "zustand";
import { User } from "@/types/auth";
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

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  mustChangePassword: boolean;
  pendingEmail: string | null;
  pendingPassword: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  clearMustChangePassword: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  mustChangePassword: false,
  pendingEmail: null,
  pendingPassword: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null, mustChangePassword: false });
    try {
      const response = await apiLogin(email, password);

      if (!response.ok || !response.data) {
        set({ isLoading: false, error: response.error || "Invalid credentials" });
        return false;
      }

      const result = response.data;
      if (!result.success) {
        set({ isLoading: false, error: "Login failed" });
        return false;
      }

      // Check if password change is required
      if (result.mustChangePassword) {
        set({
          isLoading: false,
          mustChangePassword: true,
          pendingEmail: email,
          pendingPassword: password,
          error: null,
        });
        return false; // Don't complete login yet
      }

      // After successful login, fetch full user profile
      const meResponse = await getMe();
      if (meResponse.ok && meResponse.data) {
        const userData = meResponse.data as any;
        const user: User = {
          id: userData.id,
          openId: userData.openId || "",
          email: userData.email || "",
          name: userData.name || "",
          role: userData.role || "employee",
          tenantId: userData.tenantId || null,
          tenantName: userData.tenantName || null,
          avatarUrl: userData.avatarUrl || null,
          phone: userData.phone || null,
          language: userData.language || "en",
          createdAt: userData.createdAt || new Date().toISOString(),
          isSuperOwner: userData.isSuperOwner || false,
          isSalesperson: userData.isSalesperson || false,
          salespersonRank: userData.salespersonRank || null,
          superAdminRole: userData.superAdminRole || null,
        };
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        return true;
      }

      set({ isLoading: false, error: "Failed to fetch profile" });
      return false;
    } catch (e: any) {
      set({ isLoading: false, error: e?.message || "Login failed" });
      return false;
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
    set({ user: null, isAuthenticated: false, isLoading: false, error: null, mustChangePassword: false, pendingEmail: null, pendingPassword: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });

    const token = await getStoredToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Load cached user immediately (offline-first)
    try {
      const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cachedUser) {
        const user = JSON.parse(cachedUser) as User;
        set({ user, isAuthenticated: true, isLoading: false });
      }
    } catch {}

    // Then try to refresh from server
    try {
      const response = await getMe();
      if (response.ok && response.data) {
        const userData = response.data as any;
        const user: User = {
          id: userData.id,
          openId: userData.openId || "",
          email: userData.email || "",
          name: userData.name || "",
          role: userData.role || "employee",
          tenantId: userData.tenantId || null,
          tenantName: userData.tenantName || null,
          avatarUrl: userData.avatarUrl || null,
          phone: userData.phone || null,
          language: userData.language || "en",
          createdAt: userData.createdAt || new Date().toISOString(),
          isSuperOwner: userData.isSuperOwner || false,
          isSalesperson: userData.isSalesperson || false,
          salespersonRank: userData.salespersonRank || null,
          superAdminRole: userData.superAdminRole || null,
        };
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
      } else if (response.status === 401) {
        await removeToken();
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      // Network error — keep cached user (offline mode)
      if (!get().user) {
        set({ isLoading: false });
      }
    }
  },

  clearError: () => set({ error: null }),
  clearMustChangePassword: () => set({ mustChangePassword: false, pendingEmail: null, pendingPassword: null }),
}));
