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
const JUST_LOGGED_OUT_KEY = "crew_just_logged_out";

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

  /**
   * LOGIN FLOW:
   * 1. Call auth.localLogin → backend returns { success, token, user }
   * 2. api.ts login() stores token in AsyncStorage + SecureStore
   * 3. Use the user from the login response DIRECTLY — no getMe() call needed
   * 4. Background: enrich user data with full profile (non-blocking)
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null, mustChangePassword: false });
    try {
      const response = await apiLogin(email, password);

      if (!response.ok || !response.data) {
        const errorMsg = response.error || "Invalid email or password. Please try again.";
        set({ isLoading: false, error: errorMsg });
        return false;
      }

      const result = response.data;
      if (!result.success) {
        set({ isLoading: false, error: "Login failed. Please check your credentials." });
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
        return false;
      }

      // Use user data from login response directly
      const loginUser = result.user;
      const user: User = {
        id: loginUser.id,
        openId: "",
        email: loginUser.email || email,
        name: loginUser.name || "",
        role: (loginUser.role as User["role"]) || "employee",
        tenantId: null,
        tenantName: null,
        avatarUrl: null,
        phone: null,
        language: "en",
        createdAt: new Date().toISOString(),
        isSuperOwner: false,
        isSalesperson: result.isSalesperson || false,
        salespersonRank: result.salespersonRank || null,
        superAdminRole: null,
      };

      // Cache user and set authenticated IMMEDIATELY
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false, error: null });

      // Background: enrich user data with full profile (non-blocking)
      setTimeout(async () => {
        try {
          const meResponse = await getMe();
          if (meResponse.ok && meResponse.data) {
            const fullData = meResponse.data as Record<string, unknown>;
            const enrichedUser: User = {
              id: (fullData.id as number) || loginUser.id,
              openId: (fullData.openId as string) || "",
              email: (fullData.email as string) || email,
              name: (fullData.name as string) || loginUser.name || "",
              role: ((fullData.role as string) || loginUser.role || "employee") as User["role"],
              tenantId: (fullData.tenantId as number | null) || null,
              tenantName: (fullData.tenantName as string | null) || null,
              avatarUrl: (fullData.avatarUrl as string | null) || null,
              phone: (fullData.phone as string | null) || null,
              language: (fullData.preferredLanguage as string) || "en",
              createdAt: (fullData.createdAt as string) || new Date().toISOString(),
              isSuperOwner: (fullData.isSuperOwner as boolean) || false,
              isSalesperson: (fullData.isSalesperson as boolean) || result.isSalesperson || false,
              salespersonRank: (fullData.salespersonStatus as string | null) || result.salespersonRank || null,
              superAdminRole: (fullData.superAdminRole as string | null) || null,
            };
            await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(enrichedUser));
            set({ user: enrichedUser });
          }
        } catch {
          // Silently ignore — user is already authenticated with basic data
        }
      }, 500);

      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Connection error. Please check your internet and try again.";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    // Set the just-logged-out flag BEFORE clearing auth state
    // This prevents Face ID from auto-triggering when LoginScreen mounts
    try {
      await AsyncStorage.setItem(JUST_LOGGED_OUT_KEY, "true");
    } catch {}

    try {
      await apiLogout();
    } catch {
      // Ignore logout API errors
    }
    await removeToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      mustChangePassword: false,
      pendingEmail: null,
      pendingPassword: null,
    });
  },

  /**
   * checkAuth: Called on app cold start.
   * Reads token from persistent storage.
   * If token exists, loads cached user immediately (offline-first),
   * then validates with server in background.
   */
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
    } catch {
      // If cache read fails, continue to server validation
    }

    // Validate token with server
    try {
      const response = await getMe();
      if (response.ok && response.data) {
        const userData = response.data as Record<string, unknown>;
        const user: User = {
          id: (userData.id as number) || 0,
          openId: (userData.openId as string) || "",
          email: (userData.email as string) || "",
          name: (userData.name as string) || "",
          role: ((userData.role as string) || "employee") as User["role"],
          tenantId: (userData.tenantId as number | null) || null,
          tenantName: (userData.tenantName as string | null) || null,
          avatarUrl: (userData.avatarUrl as string | null) || null,
          phone: (userData.phone as string | null) || null,
          language: (userData.preferredLanguage as string) || "en",
          createdAt: (userData.createdAt as string) || new Date().toISOString(),
          isSuperOwner: (userData.isSuperOwner as boolean) || false,
          isSalesperson: (userData.isSalesperson as boolean) || false,
          salespersonRank: (userData.salespersonStatus as string | null) || null,
          superAdminRole: (userData.superAdminRole as string | null) || null,
        };
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
      } else if (response.status === 401) {
        // Token expired or invalid
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
  clearMustChangePassword: () => set({
    mustChangePassword: false,
    pendingEmail: null,
    pendingPassword: null,
  }),
}));
