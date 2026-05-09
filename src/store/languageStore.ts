import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";
import es from "@/i18n/es.json";

const LANGUAGE_KEY = "crew_app_language";

export type AppLanguage = "en" | "pt" | "es";

type TranslationMap = Record<string, string>;

const translations: Record<AppLanguage, TranslationMap> = { en, pt, es };

// Legacy labels interface for backward compatibility with menu/drawer
export interface LanguageLabels {
  dashboard: string;
  fieldOperations: string;
  timeTracking: string;
  myHours: string;
  activeWorkers: string;
  liveMap: string;
  dailyLogs: string;
  fieldMedia: string;
  projects: string;
  jobSchedule: string;
  dispatch: string;
  team: string;
  employees: string;
  payroll: string;
  productionPay: string;
  jobCosting: string;
  estimates: string;
  receivables: string;
  expenses: string;
  jobCost: string;
  fleet: string;
  vehicles: string;
  dispatchBoard: string;
  tripLog: string;
  mileageLog: string;
  costReport: string;
  inventory: string;
  materialCatalog: string;
  inventoryItems: string;
  warehouses: string;
  vendors: string;
  purchaseOrders: string;
  vendorInvoices: string;
  tools: string;
  sdsLibrary: string;
  reports: string;
  locationReport: string;
  referralProgram: string;
  myReferrals: string;
  settings: string;
  departments: string;
  workTypes: string;
  classifications: string;
  jobRoles: string;
  companyProfile: string;
  billing: string;
  accessRoles: string;
  adminPanel: string;
  signOut: string;
  welcomeBack: string;
  noProjectsFound: string;
  searchProjects: string;
  noWorkersClocked: string;
  currentlyWorking: string;
  quickActions: string;
  projectStatus: string;
  active: string;
  completed: string;
  viewAll: string;
}

// Build legacy labels from the new flat translation map
function buildLegacyLabels(lang: AppLanguage): LanguageLabels {
  const t = translations[lang];
  return {
    dashboard: t["dashboard.welcomeBack"] ? "Dashboard" : "Dashboard",
    fieldOperations: lang === "pt" ? "Operações de Campo" : lang === "es" ? "Operaciones de Campo" : "Field Operations",
    timeTracking: t["time.title"] || "Time Tracking",
    myHours: t["myHours.title"] || "My Hours",
    activeWorkers: t["activeWorkers.title"] || "Active Workers",
    liveMap: t["liveMap.title"] || "Live Map",
    dailyLogs: t["dailyLogs.title"] || "Daily Logs",
    fieldMedia: t["fieldMedia.title"] || "Field Media",
    projects: t["projects.title"] || "Projects",
    jobSchedule: t["jobSchedule.title"] || "Job Schedule",
    dispatch: t["dispatch.title"] || "Dispatch",
    team: lang === "pt" ? "Equipe" : lang === "es" ? "Equipo" : "Team",
    employees: t["employees.title"] || "Employees",
    payroll: t["payroll.title"] || "Payroll",
    productionPay: t["productionPay.title"] || "Production Pay",
    jobCosting: t["jobCost.title"] || "Job Costing",
    estimates: t["estimates.title"] || "Estimates",
    receivables: t["receivables.title"] || "Receivables",
    expenses: t["expenses.title"] || "Expenses",
    jobCost: t["jobCost.title"] || "Job Cost",
    fleet: t["fleet.title"] || "Fleet",
    vehicles: t["fleet.vehicles"] || "Vehicles",
    dispatchBoard: t["fleet.dispatchBoard"] || "Dispatch Board",
    tripLog: t["fleet.tripLog"] || "Trip Log",
    mileageLog: t["fleet.mileageLog"] || "Mileage Log",
    costReport: t["fleet.costReport"] || "Cost Report",
    inventory: t["inventory.title"] || "Inventory",
    materialCatalog: t["inventory.materialCatalog"] || "Material Catalog",
    inventoryItems: t["inventory.items"] || "Inventory Items",
    warehouses: t["inventory.warehouses"] || "Warehouses",
    vendors: t["inventory.vendors"] || "Vendors",
    purchaseOrders: t["inventory.purchaseOrders"] || "Purchase Orders",
    vendorInvoices: t["inventory.vendorInvoices"] || "Vendor Invoices",
    tools: t["tools.title"] || "Tools",
    sdsLibrary: t["tools.sdsLibrary"] || "SDS Library",
    reports: t["tools.reports"] || "Reports",
    locationReport: t["tools.locationReport"] || "Location Report",
    referralProgram: t["referrals.title"] || "Referral Program",
    myReferrals: t["referrals.myReferrals"] || "My Referrals",
    settings: t["settings.title"] || "Settings",
    departments: t["settings.departments"] || "Departments",
    workTypes: t["settings.workTypes"] || "Work Types",
    classifications: t["settings.classifications"] || "Classifications",
    jobRoles: t["settings.jobRoles"] || "Job Roles",
    companyProfile: t["settings.companyProfile"] || "Company Profile",
    billing: t["settings.billing"] || "Billing & Subscription",
    accessRoles: t["settings.accessRoles"] || "Access Roles",
    adminPanel: t["settings.adminPanel"] || "Admin Panel",
    signOut: t["auth.signOut"] || "Sign Out",
    welcomeBack: t["dashboard.welcomeBack"] || "Welcome back, ",
    noProjectsFound: t["projects.noProjects"] || "No projects found",
    searchProjects: t["projects.search"] || "Search projects...",
    noWorkersClocked: t["dashboard.noWorkersClocked"] || "No workers clocked in",
    currentlyWorking: t["dashboard.currentlyWorking"] || "Currently Working",
    quickActions: t["dashboard.quickActions"] || "Quick Actions",
    projectStatus: t["dashboard.projectStatus"] || "Project Status",
    active: t["common.active"] || "Active",
    completed: t["common.completed"] || "Completed",
    viewAll: t["dashboard.viewAll"] || "View All",
  };
}

interface LanguageStore {
  language: AppLanguage;
  labels: LanguageLabels;
  setLanguage: (lang: AppLanguage) => void;
  loadLanguage: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: "en",
  labels: buildLegacyLabels("en"),

  setLanguage: (lang: AppLanguage) => {
    set({ language: lang, labels: buildLegacyLabels(lang) });
    AsyncStorage.setItem(LANGUAGE_KEY, lang).catch(() => {});
  },

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (stored && (stored === "en" || stored === "pt" || stored === "es")) {
        set({ language: stored, labels: buildLegacyLabels(stored) });
      }
    } catch {
      // Default to English on failure
    }
  },

  t: (key: string, params?: Record<string, string | number>): string => {
    const { language } = get();
    const map = translations[language];
    let value = map[key] || translations.en[key] || key;
    
    // Handle interpolation: {{count}}, {{name}}, etc.
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
    }
    
    return value;
  },
}));

// Standalone t function for use outside React components
export function t(key: string, params?: Record<string, string | number>): string {
  return useLanguageStore.getState().t(key, params);
}

export function getTranslations(lang: AppLanguage): LanguageLabels {
  return buildLegacyLabels(lang);
}
