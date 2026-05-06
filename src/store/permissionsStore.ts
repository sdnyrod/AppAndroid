import { create } from "zustand";
import { trpcQuery } from "@/services/api";

interface PermissionsResponse {
  role: string;
  customRoleId: number | null;
  permissions: string[];
}

interface PermissionsStore {
  permissions: Set<string>;
  role: string;
  isOwner: boolean;
  loading: boolean;
  loaded: boolean;
  fetchPermissions: () => Promise<void>;
  has: (permission: string) => boolean;
  hasAny: (...permissions: string[]) => boolean;
  hasAll: (...permissions: string[]) => boolean;
  reset: () => void;
}

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  permissions: new Set<string>(),
  role: "employee",
  isOwner: false,
  loading: false,
  loaded: false,

  fetchPermissions: async () => {
    set({ loading: true });
    try {
      const response = await trpcQuery<PermissionsResponse>("roles.myPermissions");

      if (response.ok && response.data) {
        const { role, permissions } = response.data;
        const isOwner = role === "owner" || role === "admin";
        set({
          permissions: new Set(permissions),
          role,
          isOwner,
          loading: false,
          loaded: true,
        });
      } else {
        set({ loading: false, loaded: true });
      }
    } catch {
      set({ loading: false, loaded: true });
    }
  },

  has: (permission: string): boolean => {
    const { isOwner, permissions } = get();
    if (isOwner) return true;
    return permissions.has(permission);
  },

  hasAny: (...perms: string[]): boolean => {
    const { isOwner, permissions } = get();
    if (isOwner) return true;
    return perms.some((p) => permissions.has(p));
  },

  hasAll: (...perms: string[]): boolean => {
    const { isOwner, permissions } = get();
    if (isOwner) return true;
    return perms.every((p) => permissions.has(p));
  },

  reset: () => {
    set({
      permissions: new Set<string>(),
      role: "employee",
      isOwner: false,
      loading: false,
      loaded: false,
    });
  },
}));
