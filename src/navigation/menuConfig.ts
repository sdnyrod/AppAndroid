/**
 * Menu configuration matching the web DashboardLayout exactly.
 * Each group and item has requiredPermission for dynamic RBAC filtering.
 */

export interface MenuItem {
  id: string;
  label: string;
  icon: string; // Ionicons name
  requiredPermission?: string | string[];
  screen: string; // Screen name in navigator
}

export interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  requiredPermission?: string | string[];
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  // ── Dashboard ──
  {
    id: "main",
    label: "Dashboard",
    icon: "grid-outline",
    requiredPermission: "dashboard.view",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid-outline", screen: "Dashboard", requiredPermission: "dashboard.view" },
    ],
  },
  // ── 1. Field Operations ──
  {
    id: "fieldops",
    label: "Field Operations",
    icon: "time-outline",
    requiredPermission: ["time.clock_in_self", "time.view_all_entries", "time.view_active_workers"],
    items: [
      { id: "time-tracking", label: "Time Tracking", icon: "time-outline", screen: "TimeTracking", requiredPermission: ["time.clock_in_self", "time.view_all_entries"] },
      { id: "my-hours", label: "My Hours", icon: "clipboard-outline", screen: "MyHours", requiredPermission: "time.clock_in_self" },
      { id: "active-workers", label: "Active Workers", icon: "people-outline", screen: "ActiveWorkers", requiredPermission: "time.view_active_workers" },
      { id: "live-map", label: "Live Map", icon: "map-outline", screen: "LiveMap", requiredPermission: "location.view_live_map" },
      { id: "daily-logs", label: "Daily Logs", icon: "mic-outline", screen: "DailyLogs", requiredPermission: ["dailylogs.view_own", "dailylogs.view_all"] },
      { id: "field-media", label: "Field Media", icon: "camera-outline", screen: "FieldMedia", requiredPermission: ["fieldmedia.view_own", "fieldmedia.view_all"] },
    ],
  },
  // ── 2. Projects ──
  {
    id: "projects",
    label: "Projects",
    icon: "folder-outline",
    requiredPermission: ["projects.view_all", "projects.view_assigned"],
    items: [
      { id: "projects", label: "Projects", icon: "folder-outline", screen: "Projects", requiredPermission: ["projects.view_all", "projects.view_assigned"] },
      { id: "dispatch", label: "Dispatch", icon: "bus-outline", screen: "Dispatch", requiredPermission: "time.clock_in_others" },
    ],
  },
  // ── 2. Team & Payroll ──
  {
    id: "team",
    label: "Team",
    icon: "people-outline",
    requiredPermission: ["employees.view_list", "payroll.view_report"],
    items: [
      { id: "employees", label: "Employees", icon: "people-outline", screen: "Employees", requiredPermission: "employees.view_list" },
      { id: "payroll", label: "Payroll", icon: "cash-outline", screen: "Payroll", requiredPermission: "payroll.view_report" },
      { id: "production", label: "Production Pay", icon: "construct-outline", screen: "ProductionPay", requiredPermission: "payroll.view_report" },
    ],
  },
  // ── 3. Job Costing ──
  {
    id: "jobcosting",
    label: "Job Costing",
    icon: "calculator-outline",
    requiredPermission: ["estimates.view_list", "expenses.view_list", "jobcost.view_report"],
    items: [
      { id: "estimates", label: "Estimates", icon: "calculator-outline", screen: "Estimates", requiredPermission: "estimates.view_list" },
      { id: "receivables", label: "Receivables", icon: "wallet-outline", screen: "Receivables", requiredPermission: "estimates.view_list" },
      { id: "expenses", label: "Expenses", icon: "receipt-outline", screen: "Expenses", requiredPermission: "expenses.view_list" },
      { id: "job-cost", label: "Job Cost", icon: "trending-up-outline", screen: "JobCost", requiredPermission: "jobcost.view_report" },
    ],
  },
  // ── 4. Fleet ──
  {
    id: "fleet",
    label: "Fleet",
    icon: "car-outline",
    requiredPermission: "fleet.view_vehicles",
    items: [
      { id: "vehicles", label: "Vehicles", icon: "car-outline", screen: "Vehicles", requiredPermission: "fleet.view_vehicles" },
      { id: "dispatch", label: "Dispatch Board", icon: "bus-outline", screen: "Dispatch", requiredPermission: "time.clock_in_others" },
      { id: "trips", label: "Trip Log", icon: "navigate-outline", screen: "TripLog", requiredPermission: "fleet.view_trips" },
      { id: "mileage", label: "Mileage Log", icon: "speedometer-outline", screen: "MileageLog", requiredPermission: "fleet.view_mileage" },
      { id: "fleet-cost", label: "Cost Report", icon: "bar-chart-outline", screen: "FleetCostReport", requiredPermission: "fleet.view_cost_report" },
    ],
  },
  // ── 5. Inventory & Procurement ──
  {
    id: "inventory",
    label: "Inventory",
    icon: "cube-outline",
    requiredPermission: ["inventory.view_catalog", "inventory.view_stock"],
    items: [
      { id: "catalog", label: "Material Catalog", icon: "cube-outline", screen: "MaterialCatalog", requiredPermission: "inventory.view_catalog" },
      { id: "inventory-items", label: "Inventory Items", icon: "layers-outline", screen: "InventoryItems", requiredPermission: "inventory.view_stock" },
      { id: "warehouses", label: "Warehouses", icon: "business-outline", screen: "Warehouses", requiredPermission: "inventory.view_warehouses" },
      { id: "vendors", label: "Vendors", icon: "storefront-outline", screen: "Vendors", requiredPermission: "inventory.view_vendors" },
      { id: "purchase-orders", label: "Purchase Orders", icon: "cart-outline", screen: "PurchaseOrders", requiredPermission: "inventory.view_purchase_orders" },
      { id: "vendor-invoices", label: "Vendor Invoices", icon: "document-text-outline", screen: "VendorInvoices", requiredPermission: "inventory.view_purchase_orders" },
    ],
  },
  // ── 6. Tools ──
  {
    id: "tools",
    label: "Tools",
    icon: "build-outline",
    requiredPermission: ["tools.blueprint_analyzer", "tools.sds_library", "reports.view_project_report"],
    items: [
      { id: "sds-library", label: "SDS Library", icon: "shield-checkmark-outline", screen: "SDSLibrary", requiredPermission: "tools.sds_library" },
      { id: "reports", label: "Reports", icon: "bar-chart-outline", screen: "Reports", requiredPermission: ["reports.view_project_report", "reports.view_time_tracking_report"] },
      { id: "location-report", label: "Location Report", icon: "navigate-outline", screen: "LocationReport", requiredPermission: "location.view_all_locations" },
    ],
  },
  // ── 7. Referral Program ──
  {
    id: "referral",
    label: "Referral Program",
    icon: "gift-outline",
    items: [
      { id: "referrals", label: "My Referrals", icon: "gift-outline", screen: "Referrals" },
    ],
  },
  // ── 8. Settings & Admin ──
  {
    id: "settings",
    label: "Settings",
    icon: "settings-outline",
    requiredPermission: ["config.manage_departments", "config.manage_work_types", "config.manage_settings", "admin.manage_roles", "admin.view_admin_panel"],
    items: [
      { id: "departments", label: "Departments", icon: "business-outline", screen: "Departments", requiredPermission: "config.manage_departments" },
      { id: "work-types", label: "Work Types", icon: "layers-outline", screen: "WorkTypes", requiredPermission: "config.manage_work_types" },
      { id: "classifications", label: "Classifications", icon: "pricetags-outline", screen: "Classifications", requiredPermission: "config.manage_classifications" },
      { id: "job-roles", label: "Job Roles", icon: "briefcase-outline", screen: "JobRoles", requiredPermission: "config.manage_job_roles" },
      { id: "company-profile", label: "Company Profile", icon: "settings-outline", screen: "CompanyProfile", requiredPermission: "config.manage_settings" },
      { id: "billing", label: "Billing & Subscription", icon: "card-outline", screen: "Billing", requiredPermission: "config.manage_settings" },
      { id: "access-roles", label: "Access Roles", icon: "shield-outline", screen: "AccessRoles", requiredPermission: "admin.manage_roles" },
      { id: "admin-panel", label: "Admin Panel", icon: "shield-outline", screen: "AdminPanel", requiredPermission: "admin.view_admin_panel" },
    ],
  },
];

/**
 * Filter menu groups based on user permissions.
 * Matches the web DashboardLayout filtering logic exactly.
 */
export function getFilteredMenuGroups(
  has: (permission: string) => boolean,
  hasAny: (...permissions: string[]) => boolean
): MenuGroup[] {
  return MENU_GROUPS
    .filter((group) => {
      if (!group.requiredPermission) return true;
      if (Array.isArray(group.requiredPermission)) {
        return hasAny(...group.requiredPermission);
      }
      return has(group.requiredPermission);
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredPermission) return true;
        if (Array.isArray(item.requiredPermission)) {
          return hasAny(...item.requiredPermission);
        }
        return has(item.requiredPermission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}
