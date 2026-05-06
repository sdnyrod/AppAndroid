import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANGUAGE_KEY = "crew_app_language";

export type AppLanguage = "en" | "pt" | "es";

interface LanguageLabels {
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

const translations: Record<AppLanguage, LanguageLabels> = {
  en: {
    dashboard: "Dashboard",
    fieldOperations: "Field Operations",
    timeTracking: "Time Tracking",
    myHours: "My Hours",
    activeWorkers: "Active Workers",
    liveMap: "Live Map",
    dailyLogs: "Daily Logs",
    fieldMedia: "Field Media",
    projects: "Projects",
    jobSchedule: "Job Schedule",
    dispatch: "Dispatch",
    team: "Team",
    employees: "Employees",
    payroll: "Payroll",
    productionPay: "Production Pay",
    jobCosting: "Job Costing",
    estimates: "Estimates",
    receivables: "Receivables",
    expenses: "Expenses",
    jobCost: "Job Cost",
    fleet: "Fleet",
    vehicles: "Vehicles",
    dispatchBoard: "Dispatch Board",
    tripLog: "Trip Log",
    mileageLog: "Mileage Log",
    costReport: "Cost Report",
    inventory: "Inventory",
    materialCatalog: "Material Catalog",
    inventoryItems: "Inventory Items",
    warehouses: "Warehouses",
    vendors: "Vendors",
    purchaseOrders: "Purchase Orders",
    vendorInvoices: "Vendor Invoices",
    tools: "Tools",
    sdsLibrary: "SDS Library",
    reports: "Reports",
    locationReport: "Location Report",
    referralProgram: "Referral Program",
    myReferrals: "My Referrals",
    settings: "Settings",
    departments: "Departments",
    workTypes: "Work Types",
    classifications: "Classifications",
    jobRoles: "Job Roles",
    companyProfile: "Company Profile",
    billing: "Billing & Subscription",
    accessRoles: "Access Roles",
    adminPanel: "Admin Panel",
    signOut: "Sign Out",
    welcomeBack: "Welcome back, ",
    noProjectsFound: "No projects found",
    searchProjects: "Search projects...",
    noWorkersClocked: "No workers clocked in",
    currentlyWorking: "Currently Working",
    quickActions: "Quick Actions",
    projectStatus: "Project Status",
    active: "Active",
    completed: "Completed",
    viewAll: "View All",
  },
  pt: {
    dashboard: "Painel",
    fieldOperations: "Operações de Campo",
    timeTracking: "Controle de Ponto",
    myHours: "Minhas Horas",
    activeWorkers: "Trabalhadores Ativos",
    liveMap: "Mapa ao Vivo",
    dailyLogs: "Registros Diários",
    fieldMedia: "Mídia de Campo",
    projects: "Projetos",
    jobSchedule: "Agenda de Trabalho",
    dispatch: "Despacho",
    team: "Equipe",
    employees: "Funcionários",
    payroll: "Folha de Pagamento",
    productionPay: "Pagamento Produção",
    jobCosting: "Custo de Obra",
    estimates: "Orçamentos",
    receivables: "Recebíveis",
    expenses: "Despesas",
    jobCost: "Custo do Trabalho",
    fleet: "Frota",
    vehicles: "Veículos",
    dispatchBoard: "Painel de Despacho",
    tripLog: "Registro de Viagem",
    mileageLog: "Registro de Km",
    costReport: "Relatório de Custo",
    inventory: "Estoque",
    materialCatalog: "Catálogo de Materiais",
    inventoryItems: "Itens de Estoque",
    warehouses: "Depósitos",
    vendors: "Fornecedores",
    purchaseOrders: "Ordens de Compra",
    vendorInvoices: "Notas de Fornecedor",
    tools: "Ferramentas",
    sdsLibrary: "Biblioteca SDS",
    reports: "Relatórios",
    locationReport: "Relatório de Local",
    referralProgram: "Programa de Indicação",
    myReferrals: "Minhas Indicações",
    settings: "Configurações",
    departments: "Departamentos",
    workTypes: "Tipos de Trabalho",
    classifications: "Classificações",
    jobRoles: "Funções",
    companyProfile: "Perfil da Empresa",
    billing: "Faturamento e Assinatura",
    accessRoles: "Funções de Acesso",
    adminPanel: "Painel Admin",
    signOut: "Sair",
    welcomeBack: "Bem-vindo, ",
    noProjectsFound: "Nenhum projeto encontrado",
    searchProjects: "Buscar projetos...",
    noWorkersClocked: "Nenhum trabalhador ativo",
    currentlyWorking: "Trabalhando Agora",
    quickActions: "Ações Rápidas",
    projectStatus: "Status dos Projetos",
    active: "Ativos",
    completed: "Concluídos",
    viewAll: "Ver Todos",
  },
  es: {
    dashboard: "Panel",
    fieldOperations: "Operaciones de Campo",
    timeTracking: "Control de Tiempo",
    myHours: "Mis Horas",
    activeWorkers: "Trabajadores Activos",
    liveMap: "Mapa en Vivo",
    dailyLogs: "Registros Diarios",
    fieldMedia: "Media de Campo",
    projects: "Proyectos",
    jobSchedule: "Agenda de Trabajo",
    dispatch: "Despacho",
    team: "Equipo",
    employees: "Empleados",
    payroll: "Nómina",
    productionPay: "Pago Producción",
    jobCosting: "Costo de Obra",
    estimates: "Presupuestos",
    receivables: "Cuentas por Cobrar",
    expenses: "Gastos",
    jobCost: "Costo del Trabajo",
    fleet: "Flota",
    vehicles: "Vehículos",
    dispatchBoard: "Panel de Despacho",
    tripLog: "Registro de Viaje",
    mileageLog: "Registro de Km",
    costReport: "Informe de Costo",
    inventory: "Inventario",
    materialCatalog: "Catálogo de Materiales",
    inventoryItems: "Artículos de Inventario",
    warehouses: "Almacenes",
    vendors: "Proveedores",
    purchaseOrders: "Órdenes de Compra",
    vendorInvoices: "Facturas de Proveedor",
    tools: "Herramientas",
    sdsLibrary: "Biblioteca SDS",
    reports: "Informes",
    locationReport: "Informe de Ubicación",
    referralProgram: "Programa de Referidos",
    myReferrals: "Mis Referidos",
    settings: "Configuración",
    departments: "Departamentos",
    workTypes: "Tipos de Trabajo",
    classifications: "Clasificaciones",
    jobRoles: "Roles de Trabajo",
    companyProfile: "Perfil de Empresa",
    billing: "Facturación y Suscripción",
    accessRoles: "Roles de Acceso",
    adminPanel: "Panel Admin",
    signOut: "Cerrar Sesión",
    welcomeBack: "Bienvenido, ",
    noProjectsFound: "No se encontraron proyectos",
    searchProjects: "Buscar proyectos...",
    noWorkersClocked: "Ningún trabajador activo",
    currentlyWorking: "Trabajando Ahora",
    quickActions: "Acciones Rápidas",
    projectStatus: "Estado de Proyectos",
    active: "Activos",
    completed: "Completados",
    viewAll: "Ver Todos",
  },
};

interface LanguageStore {
  language: AppLanguage;
  labels: LanguageLabels;
  setLanguage: (lang: AppLanguage) => void;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: "en",
  labels: translations.en,

  setLanguage: (lang: AppLanguage) => {
    set({ language: lang, labels: translations[lang] });
    AsyncStorage.setItem(LANGUAGE_KEY, lang).catch(() => {
      // Non-critical persistence failure
    });
  },

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (stored && (stored === "en" || stored === "pt" || stored === "es")) {
        set({ language: stored, labels: translations[stored] });
      }
    } catch {
      // Default to English on failure
    }
  },
}));

export function getTranslations(lang: AppLanguage): LanguageLabels {
  return translations[lang];
}
