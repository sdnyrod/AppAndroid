/**
 * Menu configuration matching the web DashboardLayout exactly.
 * Each group and item has requiredPermission for dynamic RBAC filtering.
 * Labels are resolved dynamically from the languageStore.
 */
import type { LanguageLabels } from "@/store/languageStore";

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

/**
 * Build menu groups with translated labels.
 * Call this inside a component where useLanguageStore().labels is available.
 */
export function buildMenuGroups(labels: LanguageLabels): MenuGroup[] {
  return [
    // ── Dashboard ──
    {
      id: "main",
      label: labels.dashboard,
      icon: "grid-outline",
      requiredPermission: "dashboard.view",
      items: [
        { id: "dashboard", label: labels.dashboard, icon: "grid-outline", screen: "Dashboard", requiredPermission: "dashboard.view" },
      ],
    },
    // ── 1. Field Operations ──
    {
      id: "fieldops",
      label: labels.fieldOperations,
      icon: "time-outline",
      requiredPermission: ["time.clock_in_self", "time.view_all_entries", "time.view_active_workers"],
      items: [
        { id: "time-tracking", label: labels.timeTracking, icon: "time-outline", screen: "TimeTracking", requiredPermission: ["time.clock_in_self", "time.view_all_entries"] },
        { id: "my-hours", label: labels.myHours, icon: "clipboard-outline", screen: "MyHours", requiredPermission: "time.clock_in_self" },
        { id: "active-workers", label: labels.activeWorkers, icon: "people-outline", screen: "ActiveWorkers", requiredPermission: "time.view_active_workers" },
        { id: "live-map", label: labels.liveMap, icon: "map-outline", screen: "LiveMap", requiredPermission: "location.view_live_map" },
        { id: "daily-logs", label: labels.dailyLogs, icon: "mic-outline", screen: "DailyLogs", requiredPermission: ["dailylogs.view_own", "dailylogs.view_all"] },
        { id: "field-media", label: labels.fieldMedia, icon: "camera-outline", screen: "FieldMedia", requiredPermission: ["fieldmedia.view_own", "fieldmedia.view_all"] },
      ],
    },
    // ── 2. Projects ──
    {
      id: "projects",
      label: labels.projects,
      icon: "folder-outline",
      requiredPermission: ["projects.view_all", "projects.view_assigned"],
      items: [
        { id: "projects", label: labels.projects, icon: "folder-outline", screen: "Projects", requiredPermission: ["projects.view_all", "projects.view_assigned"] },
        { id: "job-schedule", label: labels.jobSchedule, icon: "calendar-outline", screen: "JobSchedule", requiredPermission: ["projects.view_all", "projects.view_assigned"] },
        { id: "dispatch", label: labels.dispatch, icon: "bus-outline", screen: "Dispatch", requiredPermission: "time.clock_in_others" },
      ],
    },
    // ── 3. Team & Payroll ──
    {
      id: "team",
      label: labels.team,
      icon: "people-outline",
      requiredPermission: ["employees.view_list", "payroll.view_report"],
      items: [
        { id: "employees", label: labels.employees, icon: "people-outline", screen: "Employees", requiredPermission: "employees.view_list" },
        { id: "payroll", label: labels.payroll, icon: "cash-outline", screen: "Payroll", requiredPermission: "payroll.view_report" },
        { id: "production", label: labels.productionPay, icon: "construct-outline", screen: "ProductionPay", requiredPermission: "payroll.view_report" },
      ],
    },
    // ── 4. Job Costing ──
    {
      id: "jobcosting",
      label: labels.jobCosting,
      icon: "calculator-outline",
      requiredPermission: ["estimates.view_list", "expenses.view_list", "jobcost.view_report"],
      items: [
        { id: "estimates", label: labels.estimates, icon: "calculator-outline", screen: "Estimates", requiredPermission: "estimates.view_list" },
        { id: "receivables", label: labels.receivables, icon: "wallet-outline", screen: "Receivables", requiredPermission: "estimates.view_list" },
        { id: "expenses", label: labels.expenses, icon: "receipt-outline", screen: "Expenses", requiredPermission: "expenses.view_list" },
        { id: "job-cost", label: labels.jobCost, icon: "trending-up-outline", screen: "JobCost", requiredPermission: "jobcost.view_report" },
      ],
    },
    // ── 5. Fleet ──
    {
      id: "fleet",
      label: labels.fleet,
      icon: "car-outline",
      requiredPermission: "fleet.view_vehicles",
      items: [
        { id: "vehicles", label: labels.vehicles, icon: "car-outline", screen: "Vehicles", requiredPermission: "fleet.view_vehicles" },
        { id: "dispatch-board", label: labels.dispatchBoard, icon: "bus-outline", screen: "Dispatch", requiredPermission: "time.clock_in_others" },
        { id: "trips", label: labels.tripLog, icon: "navigate-outline", screen: "TripLog", requiredPermission: "fleet.view_trips" },
        { id: "mileage", label: labels.mileageLog, icon: "speedometer-outline", screen: "MileageLog", requiredPermission: "fleet.view_mileage" },
        { id: "fleet-cost", label: labels.costReport, icon: "bar-chart-outline", screen: "FleetCostReport", requiredPermission: "fleet.view_cost_report" },
      ],
    },
    // ── 6. Inventory & Procurement ──
    {
      id: "inventory",
      label: labels.inventory,
      icon: "cube-outline",
      requiredPermission: ["inventory.view_catalog", "inventory.view_stock"],
      items: [
        { id: "catalog", label: labels.materialCatalog, icon: "cube-outline", screen: "MaterialCatalog", requiredPermission: "inventory.view_catalog" },
        { id: "inventory-items", label: labels.inventoryItems, icon: "layers-outline", screen: "InventoryItems", requiredPermission: "inventory.view_stock" },
        { id: "warehouses", label: labels.warehouses, icon: "business-outline", screen: "Warehouses", requiredPermission: "inventory.view_warehouses" },
        { id: "vendors", label: labels.vendors, icon: "storefront-outline", screen: "Vendors", requiredPermission: "inventory.view_vendors" },
        { id: "purchase-orders", label: labels.purchaseOrders, icon: "cart-outline", screen: "PurchaseOrders", requiredPermission: "inventory.view_purchase_orders" },
        { id: "vendor-invoices", label: labels.vendorInvoices, icon: "document-text-outline", screen: "VendorInvoices", requiredPermission: "inventory.view_purchase_orders" },
      ],
    },
    // ── 7. Tools ──
    {
      id: "tools",
      label: labels.tools,
      icon: "build-outline",
      requiredPermission: ["tools.blueprint_analyzer", "tools.sds_library", "reports.view_project_report"],
      items: [
        { id: "sds-library", label: labels.sdsLibrary, icon: "shield-checkmark-outline", screen: "SDSLibrary", requiredPermission: "tools.sds_library" },
        { id: "reports", label: labels.reports, icon: "bar-chart-outline", screen: "Reports", requiredPermission: ["reports.view_project_report", "reports.view_time_tracking_report"] },
        { id: "location-report", label: labels.locationReport, icon: "navigate-outline", screen: "LocationReport", requiredPermission: "location.view_all_locations" },
      ],
    },
    // ── 8. Referral Program ──
    {
      id: "referral",
      label: labels.referralProgram,
      icon: "gift-outline",
      items: [
        { id: "referrals", label: labels.myReferrals, icon: "gift-outline", screen: "Referrals" },
      ],
    },
    // ── 9. Settings & Admin ──
    {
      id: "settings",
      label: labels.settings,
      icon: "settings-outline",
      requiredPermission: ["config.manage_departments", "config.manage_work_types", "config.manage_settings", "admin.manage_roles", "admin.view_admin_panel"],
      items: [
        { id: "departments", label: labels.departments, icon: "business-outline", screen: "Departments", requiredPermission: "config.manage_departments" },
        { id: "work-types", label: labels.workTypes, icon: "layers-outline", screen: "WorkTypes", requiredPermission: "config.manage_work_types" },
        { id: "classifications", label: labels.classifications, icon: "pricetags-outline", screen: "Classifications", requiredPermission: "config.manage_classifications" },
        { id: "job-roles", label: labels.jobRoles, icon: "briefcase-outline", screen: "JobRoles", requiredPermission: "config.manage_job_roles" },
        { id: "company-profile", label: labels.companyProfile, icon: "settings-outline", screen: "CompanyProfile", requiredPermission: "config.manage_settings" },
        { id: "billing", label: labels.billing, icon: "card-outline", screen: "Billing", requiredPermission: "config.manage_settings" },
        { id: "access-roles", label: labels.accessRoles, icon: "shield-outline", screen: "AccessRoles", requiredPermission: "admin.manage_roles" },
        { id: "admin-panel", label: labels.adminPanel, icon: "shield-outline", screen: "AdminPanel", requiredPermission: "admin.view_admin_panel" },
      ],
    },
  ];
}

/**
 * Filter menu groups based on user permissions.
 * Matches the web DashboardLayout filtering logic exactly.
 */
export function getFilteredMenuGroups(
  labels: LanguageLabels,
  has: (permission: string) => boolean,
  hasAny: (...permissions: string[]) => boolean
): MenuGroup[] {
  return buildMenuGroups(labels)
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
