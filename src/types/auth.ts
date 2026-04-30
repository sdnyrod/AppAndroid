// User roles matching the database enum: ["employee", "supervisor", "owner", "admin"]
export type UserRole = "employee" | "supervisor" | "owner" | "admin";

export interface User {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: number | null;
  tenantName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  language: string;
  createdAt: string;
  // Tenant subscription info
  tenantStatus?: "trial" | "active" | "trial_expired" | "suspended" | "cancelled";
  trialEndsAt?: string | null;
  // Platform-level flags
  isSuperOwner?: boolean;
  isSalesperson?: boolean;
  salespersonRank?: string | null;
  superAdminRole?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Permission system
export interface PermissionsState {
  permissions: Set<string>;
  role: string;
  isOwner: boolean;
  loading: boolean;
}
