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

  /**
   * DEFINITIVE LOGIN FLOW:
   * 1. Call auth.localLogin → backend returns { success, token, user }
   * 2. storeToken(token) → sets in-memory + persists to SecureStore
   * 3. Use the USER from the login response DIRECTLY — NO getMe() call needed
   * 4. Background: fetch full profile via getMe() to enrich user data (non-blocking)
   *
   * This eliminates ALL race conditions because:
   * - We never depend on SecureStore read-after-write timing
   * - The user object comes from the same HTTP response as the token
   * - The app becomes authenticated immediately with basic user data
   * - Full profile enrichment happens in background after auth is established
   */
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

      // DEFINITIVE: Use user data from login response directly
      // No getMe() call needed — token is already in memory from login()
      const loginUser = result.user;
      const user: User = {
        id: loginUser.id,
        openId: "",
        email: loginUser.email || email,
        name: loginUser.name || "",
        role: loginUser.role || "employee",
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
      // This runs AFTER the user is already authenticated and on the dashboard
      setTimeout(async () => {
        try {
          const meResponse = await getMe();
          if (meResponse.ok && meResponse.data) {
            const fullData = meResponse.data as any;
            const enrichedUser: User = {
              id: fullData.id,
              openId: fullData.openId || "",
              email: fullData.email || email,
              name: fullData.name || loginUser.name || "",
              role: fullData.role || loginUser.role || "employee",
              tenantId: fullData.tenantId || null,
              tenantName: fullData.tenantName || null,
              avatarUrl: fullData.avatarUrl || null,
              phone: fullData.phone || null,
              language: fullData.preferredLanguage || "en",
              createdAt: fullData.createdAt || new Date().toISOString(),
              isSuperOwner: fullData.isSuperOwner || false,
              isSalesperson: fullData.isSalesperson || result.isSalesperson || false,
              salespersonRank: fullData.salespersonStatus || result.salespersonRank || null,
              superAdminRole: fullData.superAdminRole || null,
            };
            await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(enrichedUser));
            set({ user: enrichedUser });
          }
        } catch {
          // Silently ignore — user is already authenticated with basic data
        }
      }, 500);

      return true;
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

  /**
   * checkAuth: Called on app cold start.
   * Reads token from SecureStore (persisted from previous session).
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
    } catch {}

    // Then validate token with server
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
          language: userData.preferredLanguage || "en",
          createdAt: userData.createdAt || new Date().toISOString(),
          isSuperOwner: userData.isSuperOwner || false,
          isSalesperson: userData.isSalesperson || false,
          salespersonRank: userData.salespersonStatus || null,
          superAdminRole: userData.superAdminRole || null,
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
  clearMustChangePassword: () => set({ mustChangePassword: false, pendingEmail: null, pendingPassword: null }),
}));
