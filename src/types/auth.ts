// User roles matching the web system
export type UserRole =
  | "super_owner"   // Sidney - platform owner
  | "admin"         // Tenant admin
  | "supervisor"    // Field supervisor
  | "worker"        // Field worker
  | "salesperson"   // Sales team member
  | "director";     // Commercial director

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  tenantId: number | null;
  tenantName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  language: string;
  createdAt: string;
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

export interface RegisterTenantData {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  plan: "starter" | "professional" | "business" | "enterprise";
  language: string;
}

export interface TenantStatus {
  status: "trial" | "active" | "suspended" | "cancelled";
  trialEndsAt: string | null;
  plan: string;
  daysRemaining: number | null;
}
