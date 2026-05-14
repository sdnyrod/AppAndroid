import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { usePermissionsStore } from "@/store/permissionsStore";
import { useLanguageStore } from "@/store/languageStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const APP_VERSION = "v1.3.0";

interface DashboardKPIs {
  employees: { total: number; active: number };
  projects: {
    total: number;
    active: number;
    activeBudget: number;
    readyForBilling: number;
    readyForBillingBudget: number;
    completed: number;
    completedBudget: number;
    paused: number;
    pausedBudget: number;
  };
  hoursThisMonth: number;
  payrollThisMonth: number;
  payrollPeriodLabel: string;
  pipeline: { total: number; approved: number; pending: number };
  expensesThisMonth: number;
  contractors: number;
  inventory: {
    totalValue: number;
    totalItems: number;
    uniqueMaterials: number;
    lowStockAlerts: number;
    recentEvents: number;
  };
}

interface BasicStats {
  totalEmployees: number;
  activeProjects: number;
  clockedInNow: number;
  totalProjects: number;
}

interface ActiveEntryRaw {
  entry: {
    id: number;
    clockIn: string;
    projectId: number | null;
  };
  user: {
    id: number;
    name: string;
  };
  project: {
    id: number;
    name: string;
  } | null;
}

interface ActiveEntry {
  id: number;
  employeeName: string;
  projectName: string;
  clockInTime: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { has, hasAny, isOwner, loaded: permissionsLoaded } = usePermissionsStore();
  const { labels, t } = useLanguageStore();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayScheduleCount, setTodayScheduleCount] = useState<number>(0);

  const fetchDashboard = useCallback(async () => {
    const statsPromise = apiClient.get<BasicStats>("dashboard.getStats").catch(() => null);
    const kpiPromise = apiClient.get<DashboardKPIs>("reports.dashboardKPIs").catch(() => null);
    // FIX: Use the correct endpoint time.getAllActive instead of non-existent time.getActiveEntries
    const entriesPromise = apiClient.get<ActiveEntryRaw[]>("time.getAllActive").catch(() => []);

    statsPromise.then((statsData) => {
      if (statsData) setBasicStats(statsData);
      setLoading(false);
    }).catch(() => { setLoading(false); });

    kpiPromise.then((kpiData) => {
      if (kpiData) setKpis(kpiData);
    }).catch(() => {});

    // Map the raw entries from time.getAllActive to our display format
    entriesPromise.then((rawEntries) => {
      if (rawEntries && Array.isArray(rawEntries)) {
        const mapped: ActiveEntry[] = rawEntries.map((raw: any) => ({
          id: raw.entry?.id || raw.id || 0,
          employeeName: raw.user?.name || raw.employeeName || raw.userName || t("common.worker"),
          projectName: raw.project?.name || raw.projectName || t("dashboard.noProject"),
          clockInTime: raw.entry?.clockIn || raw.clockIn || raw.clockInTime || "",
        }));
        setActiveEntries(mapped);
      }
    }).catch(() => {});

    // Fetch today's schedule count
    if (isOwner || hasAny("projects.view_all", "projects.view_assigned")) {
      const todayStr = new Date().toISOString().split("T")[0];
      apiClient.get<any[]>("scheduling.getByDateRange", { startDate: todayStr, endDate: todayStr })
        .then((schedules) => {
          if (schedules && Array.isArray(schedules)) {
            setTodayScheduleCount(schedules.length);
          }
        })
        .catch(() => {});
    }

    await Promise.allSettled([statsPromise, kpiPromise, entriesPromise]);
    setRefreshing(false);
  }, [isOwner]);

  // Refresh dashboard data when screen gains focus (e.g., returning from sub-screens)
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const formatTime = (isoString: string): string => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value).toLocaleString()}`;
    return `$${value.toFixed(0)}`;
  };

  // Date display
  const today = new Date();
  const dayNames = [t("days.sunday"), t("days.monday"), t("days.tuesday"), t("days.wednesday"), t("days.thursday"), t("days.friday"), t("days.saturday")];
  const monthNames = [t("months.january"), t("months.february"), t("months.march"), t("months.april"), t("months.may"), t("months.june"), t("months.july"), t("months.august"), t("months.september"), t("months.october"), t("months.november"), t("months.december")];
  const dateString = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const getPayrollSubtitle = (): string => {
    const label = kpis?.payrollPeriodLabel || "open";
    if (label.startsWith("since:")) return t("dashboard.openPayroll");
    if (label.startsWith("weeks:")) {
      const weeks = parseInt(label.split(":")[1]);
      return weeks === 1 ? t("dashboard.currentWeek") : `${weeks} weeks`;
    }
    return t("dashboard.currentWeek");
  };

  // =========================================================================
  // ROLE-BASED CARD FILTERING
  // =========================================================================

  const allStatCards = [
    {
      id: "active-workers",
      label: t("dashboard.activeWorkers"),
      value: String(basicStats?.totalEmployees || kpis?.employees?.total || 0),
      subtitle: `${basicStats?.clockedInNow || activeEntries.length} ${t("dashboard.clockedIn") || "clocked in"}`,
      icon: "people" as const,
      color: "#3B82F6",
      gradientStart: "#1E3A5F",
      screen: "ActiveWorkers",
      live: false,
      requiredPermission: ["employees.view_list", "time.view_active_workers"],
    },
    {
      id: "clock-in",
      label: t("dashboard.currentlyWorking") || t("dashboard.clockIn"),
      value: String(activeEntries.length || basicStats?.clockedInNow || 0),
      subtitle: t("dashboard.workersActive"),
      icon: "pulse" as const,
      color: "#10B981",
      gradientStart: "#0D3B2F",
      live: true,
      screen: "TimeTracking",
      requiredPermission: ["time.view_all_entries", "time.view_active_workers"],
    },
    {
      id: "payroll",
      label: t("dashboard.payroll"),
      value: formatCurrency(kpis?.payrollThisMonth || 0),
      subtitle: getPayrollSubtitle(),
      icon: "cash" as const,
      color: "#EF4444",
      gradientStart: "#3B1515",
      screen: "Payroll",
      live: false,
      requiredPermission: ["payroll.view_report"],
    },
    {
      id: "active-projects",
      label: t("dashboard.activeProjects"),
      value: String(kpis?.projects?.active || basicStats?.activeProjects || 0),
      subtitle: formatCurrency(kpis?.projects?.activeBudget || 0),
      icon: "folder-open" as const,
      color: "#F59E0B",
      gradientStart: "#3B2E0A",
      screen: "Projects",
      live: false,
      requiredPermission: ["projects.view_all", "projects.view_assigned"],
    },
    {
      id: "today-schedule",
      label: t("dashboard.todaysSchedule"),
      value: String(todayScheduleCount),
      subtitle: `job${todayScheduleCount !== 1 ? "s" : ""} today`,
      icon: "calendar" as const,
      color: "#14B8A6",
      gradientStart: "#0A3330",
      screen: "JobSchedule",
      live: false,
      requiredPermission: ["projects.view_all", "projects.view_assigned"],
    },
  ];

  const statCards = allStatCards.filter((card) => {
    if (isOwner) return true;
    if (!card.requiredPermission) return true;
    return hasAny(...card.requiredPermission);
  });

  const allQuickActions = [
    { label: t("dashboard.clockInAction"), icon: "time-outline" as const, screen: "TimeTracking", color: "#10B981", requiredPermission: ["time.clock_in_self"] },
    { label: labels.projects, icon: "folder-outline" as const, screen: "Projects", color: "#3B82F6", requiredPermission: ["projects.view_all", "projects.view_assigned"] },
    { label: labels.liveMap, icon: "map-outline" as const, screen: "LiveMap", color: "#8B5CF6", requiredPermission: ["location.view_live_map"] },
    { label: labels.estimates, icon: "calculator-outline" as const, screen: "Estimates", color: "#F59E0B", requiredPermission: ["estimates.view_list"] },
    { label: labels.myHours, icon: "clipboard-outline" as const, screen: "MyHours", color: "#10B981", requiredPermission: ["time.clock_in_self"] },
  ];

  const quickActions = allQuickActions.filter((action) => {
    if (isOwner) return true;
    if (!action.requiredPermission) return true;
    return hasAny(...action.requiredPermission);
  }).slice(0, 4);

  const isEmployeeView = statCards.length === 0 || (!isOwner && user?.role === "employee");

  const employeeCards = [
    {
      id: "my-hours",
      label: t("dashboard.myHoursCard"),
      value: "—",
      subtitle: t("dashboard.thisWeek"),
      icon: "time" as const,
      color: "#3B82F6",
      gradientStart: "#1E3A5F",
      screen: "MyHours",
      live: false,
    },
    {
      id: "clock-in-self",
      label: t("dashboard.clockIn"),
      value: "—",
      subtitle: t("dashboard.tapToClockIn"),
      icon: "pulse" as const,
      color: "#10B981",
      gradientStart: "#0D3B2F",
      screen: "TimeTracking",
      live: false,
    },
  ];

  // Project Status (only for owners/managers)
  const showProjectStatus = isOwner || hasAny("projects.view_all");
  const projectStatus = [
    { label: labels.active, value: kpis?.projects?.active || basicStats?.activeProjects || 0, color: "#10B981", filter: "active" },
    { label: t("dashboard.billing"), value: kpis?.projects?.readyForBilling || 0, color: "#F59E0B", filter: "ready_for_billing" },
    { label: labels.completed, value: kpis?.projects?.completed || 0, color: "#3B82F6", filter: "completed" },
  ];

  // Currently Working section (only for owners/supervisors)
  const showCurrentlyWorking = isOwner || hasAny("time.view_active_workers", "time.view_all_entries");

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.crewLabel}>CREW</Text>
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>{labels.welcomeBack}</Text>
              <Text style={styles.userNameHighlight}>{(user?.name || "User").split(" ")[0]}</Text>
            </View>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.6}
          >
            <Ionicons name="refresh" size={18} color="#5A6A80" />
          </TouchableOpacity>
        </View>
        <Text style={styles.versionLabel}>{APP_VERSION}</Text>
      </View>

      {/* Stat Cards - filtered by role */}
      <View style={styles.statsGrid}>
        {(statCards.length > 0 ? statCards : employeeCards).map((card, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.statCard, { borderColor: card.color + "60", backgroundColor: card.gradientStart }]}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.statCardTop}>
              <View style={[styles.statIconWrap, { backgroundColor: card.color + "25" }]}>
                <Ionicons name={card.icon} size={14} color={card.color} />
              </View>
              <Text style={[styles.statCardLabel, { color: card.color }]}>{card.label}</Text>
              {card.live && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDotSmall} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.statCardValue}>{card.value}</Text>
            <Text style={[styles.statCardSubtitle, { color: card.color + "CC" }]}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.quickActions}</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + "20" }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Currently Working - only for owners/supervisors */}
      {showCurrentlyWorking && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{labels.currentlyWorking}</Text>
            <Text style={styles.sectionCount}>{activeEntries.length} {activeEntries.length === 1 ? "worker" : "workers"}</Text>
          </View>
          {activeEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={24} color="#5A6A80" />
              <Text style={styles.emptyText}>{labels.noWorkersClocked}</Text>
            </View>
          ) : (
            activeEntries.slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.workerCard}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitial}>
                    {(entry.employeeName || "W").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{entry.employeeName}</Text>
                  <Text style={styles.workerProject}>{entry.projectName}</Text>
                </View>
                <View style={styles.workerTime}>
                  <View style={styles.liveDot} />
                  <Text style={styles.workerTimeText}>{formatTime(entry.clockInTime)}</Text>
                </View>
              </View>
            ))
          )}
          {activeEntries.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate("ActiveWorkers")}
            >
              <Text style={styles.viewAllText}>{labels.viewAll} ({activeEntries.length})</Text>
              <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Project Status - clickable cards that navigate to Projects with filter */}
      {showProjectStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.projectStatus}</Text>
          <View style={styles.projectStatusRow}>
            {projectStatus.map((status, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.projectStatusCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Projects", { statusFilter: status.filter })}
              >
                <Text style={[styles.projectStatusValue, { color: status.color }]}>{status.value}</Text>
                <Text style={styles.projectStatusLabel}>{status.label}</Text>
                <Ionicons name="chevron-forward" size={12} color="#5A6A80" style={{ marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Welcome
  welcomeSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  welcomeHeaderRow: { flexDirection: "row", alignItems: "flex-start" },
  crewLabel: { color: "#3B82F6", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  welcomeRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  welcomeText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  userNameHighlight: { color: "#3B82F6", fontSize: 22, fontWeight: "700", marginLeft: 6 },
  versionLabel: { color: "#5A6A80", fontSize: 11, fontWeight: "500", marginTop: 4 },
  dateText: { color: "#8892A4", fontSize: 13, marginTop: 4 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40",
    justifyContent: "center", alignItems: "center",
    marginTop: 4,
  },

  // Stats Grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  statCard: {
    borderRadius: 16, padding: 16, width: CARD_WIDTH, borderWidth: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 },
  statIconWrap: { width: 24, height: 24, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  statCardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, flex: 1 },
  statCardValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  statCardSubtitle: { fontSize: 11, fontWeight: "500" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#10B98120", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#10B981" },
  liveText: { color: "#10B981", fontSize: 8, fontWeight: "700" },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sectionCount: { color: "#8892A4", fontSize: 12, marginBottom: 12 },

  // Quick Actions
  quickActionsRow: { flexDirection: "row", justifyContent: "space-between" },
  quickActionBtn: { alignItems: "center", width: (width - 80) / 4 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  quickActionLabel: { color: "#8892A4", fontSize: 11, fontWeight: "500", textAlign: "center" },

  // Workers
  emptyCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40" },
  emptyText: { color: "#5A6A80", fontSize: 13 },
  workerCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  workerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 10 },
  workerInitial: { color: "#3B82F6", fontSize: 14, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerName: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  workerProject: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  workerTime: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  workerTimeText: { color: "#10B981", fontSize: 12, fontWeight: "500" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  viewAllText: { color: "#3B82F6", fontSize: 13, fontWeight: "500" },

  // Project Status - now clickable
  projectStatusRow: { flexDirection: "row", justifyContent: "space-between" },
  projectStatusCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, alignItems: "center", flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: "#1A2A40" },
  projectStatusValue: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  projectStatusLabel: { color: "#8892A4", fontSize: 11, fontWeight: "500" },
});
