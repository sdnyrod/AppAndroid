import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const APP_VERSION = "V. Teste 17";

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

interface ActiveEntry {
  id: number;
  employeeName: string;
  projectName: string;
  clockInTime: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const labels = useLanguageStore((s) => s.labels);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayScheduleCount, setTodayScheduleCount] = useState<number>(0);

  const fetchDashboard = useCallback(async () => {
    // Fire all requests independently — render as soon as the FIRST one resolves
    // This eliminates the "slowest request blocks everything" problem
    const statsPromise = apiClient.get<BasicStats>("dashboard.getStats").catch(() => null);
    const kpiPromise = apiClient.get<DashboardKPIs>("reports.dashboardKPIs").catch(() => null);
    const entriesPromise = apiClient.get<ActiveEntry[]>("time.getActiveEntries").catch(() => []);

    // Show content as soon as the fast stats endpoint returns
    statsPromise.then((statsData) => {
      if (statsData) setBasicStats(statsData);
      // Remove loading spinner as soon as first data arrives
      setLoading(false);
    }).catch(() => { setLoading(false); });

    // KPIs can arrive later — UI updates reactively
    kpiPromise.then((kpiData) => {
      if (kpiData) setKpis(kpiData);
    }).catch(() => {});

    // Active entries can arrive later
    entriesPromise.then((entries) => {
      if (entries && Array.isArray(entries)) {
        const mapped: ActiveEntry[] = (entries as unknown as Array<Record<string, any>>).map((entry) => ({
          id: entry.id || 0,
          employeeName:
            entry.user?.name ||
            entry.userName ||
            entry.employeeName ||
            "Worker",
          projectName:
            entry.project?.name ||
            entry.projectName ||
            "No project",
          clockInTime:
            entry.clockIn ||
            entry.clockInTime ||
            "",
        }));
        setActiveEntries(mapped);
      }
    }).catch(() => {});

    // Fetch today's schedule count
    const todayStr = new Date().toISOString().split("T")[0];
    apiClient.get<any[]>("scheduling.getByDateRange", { startDate: todayStr, endDate: todayStr })
      .then((schedules) => {
        if (schedules && Array.isArray(schedules)) {
          setTodayScheduleCount(schedules.length);
        }
      })
      .catch(() => {});

    // Wait for all to settle for refresh indicator
    await Promise.allSettled([statsPromise, kpiPromise, entriesPromise]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateString = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  // Calculate today's hours from active entries
  let todayHours = 0;
  if (activeEntries.length > 0) {
    activeEntries.forEach((entry) => {
      if (entry.clockInTime) {
        const clockIn = new Date(entry.clockInTime);
        const now = new Date();
        const diff = (now.getTime() - clockIn.getTime()) / 3600000;
        if (diff > 0 && diff < 24) {
          todayHours += diff;
        }
      }
    });
  }
  const displayHours = kpis?.hoursThisMonth || Math.round(todayHours * 10) / 10;

  // Stats cards matching Android V10 exactly
  const statCards = [
    {
      label: "ACTIVE WORKERS",
      value: String(basicStats?.totalEmployees || kpis?.employees?.total || 0),
      subtitle: `${basicStats?.totalEmployees || kpis?.employees?.total || 0} total`,
      icon: "people" as const,
      color: "#3B82F6",
      borderColor: "#3B82F6",
      screen: "ActiveWorkers",
      live: false,
    },
    {
      label: "CLOCK IN",
      value: String(basicStats?.clockedInNow || 0),
      subtitle: "workers active",
      icon: "pulse" as const,
      color: "#10B981",
      borderColor: "#10B981",
      live: true,
      screen: "TimeTracking",
    },
    {
      label: "TODAY'S HOURS",
      value: `${displayHours}`,
      subtitle: "Total",
      icon: "time" as const,
      color: "#6366F1",
      borderColor: "#6366F1",
      screen: "TimeTracking",
      live: false,
    },
    {
      label: "PAYROLL",
      value: formatCurrency(kpis?.payrollThisMonth || 0),
      subtitle: "This Month",
      icon: "cash" as const,
      color: "#EF4444",
      borderColor: "#EF4444",
      screen: "Payroll",
      live: false,
    },
    {
      label: "ACTIVE PROJECTS",
      value: String(kpis?.projects?.active || basicStats?.activeProjects || 0),
      subtitle: formatCurrency(kpis?.projects?.activeBudget || 0),
      icon: "folder-open" as const,
      color: "#F59E0B",
      borderColor: "#F59E0B",
      screen: "Projects",
      live: false,
    },
    {
      label: "PIPELINE",
      value: formatCurrency(kpis?.pipeline?.total || 0),
      subtitle: `${kpis?.pipeline?.approved || 0} approved · ${kpis?.pipeline?.pending || 0} pending`,
      icon: "layers" as const,
      color: "#A855F7",
      borderColor: "#A855F7",
      screen: "Projects",
      live: false,
    },
    {
      label: "TODAY'S SCHEDULE",
      value: String(todayScheduleCount),
      subtitle: `job${todayScheduleCount !== 1 ? "s" : ""} today`,
      icon: "calendar" as const,
      color: "#14B8A6",
      borderColor: "#14B8A6",
      screen: "JobSchedule",
      live: false,
    },
    {
      label: "CONTRACTORS",
      value: String(kpis?.contractors || 0),
      subtitle: "Active",
      icon: "construct" as const,
      color: "#F97316",
      borderColor: "#F97316",
      screen: "ActiveWorkers",
      live: false,
    },
  ];

  // Quick Actions
  const quickActions = [
    { label: "Clock In", icon: "time-outline" as const, screen: "TimeTracking", color: "#10B981" },
    { label: labels.projects, icon: "folder-outline" as const, screen: "Projects", color: "#3B82F6" },
    { label: labels.liveMap, icon: "map-outline" as const, screen: "LiveMap", color: "#8B5CF6" },
    { label: labels.estimates, icon: "calculator-outline" as const, screen: "Estimates", color: "#F59E0B" },
  ];

  // Project Status
  const projectStatus = [
    { label: labels.active, value: kpis?.projects?.active || basicStats?.activeProjects || 0, color: "#10B981" },
    { label: "Billing", value: kpis?.projects?.readyForBilling || 0, color: "#F59E0B" },
    { label: labels.completed, value: kpis?.projects?.completed || 0, color: "#3B82F6" },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.crewLabel}>CREW</Text>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>{labels.welcomeBack}</Text>
          <Text style={styles.userNameHighlight}>{user?.name || "User"}</Text>
          <Text style={styles.versionLabel}> {APP_VERSION}</Text>
        </View>
        <Text style={styles.dateText}>{dateString}</Text>
      </View>

      {/* 8 Stat Cards - 2x4 grid - ALL tappable */}
      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.statCard, { borderColor: card.borderColor }]}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.7}
          >
            <View style={styles.statCardTop}>
              <Ionicons name={card.icon} size={16} color={card.color} />
              <Text style={[styles.statCardLabel, { color: card.color }]}>{card.label}</Text>
              {card.live && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDotSmall} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.statCardValue}>{card.value}</Text>
            <Text style={[styles.statCardSubtitle, { color: card.color }]}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
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

      {/* Currently Working */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{labels.currentlyWorking}</Text>
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

      {/* Project Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{labels.projectStatus}</Text>
        <View style={styles.projectStatusRow}>
          {projectStatus.map((status, idx) => (
            <View key={idx} style={styles.projectStatusCard}>
              <Text style={[styles.projectStatusValue, { color: status.color }]}>{status.value}</Text>
              <Text style={styles.projectStatusLabel}>{status.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Welcome
  welcomeSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  crewLabel: { color: "#3B82F6", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  welcomeRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  welcomeText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  userNameHighlight: { color: "#3B82F6", fontSize: 22, fontWeight: "700" },
  versionLabel: { color: "#EF4444", fontSize: 12, fontWeight: "700", marginLeft: 8 },
  dateText: { color: "#8892A4", fontSize: 13, marginTop: 4 },

  // Stats Grid - matching Android V10 with colored borders
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: "#0F1D32",
    borderRadius: 4,
    padding: 14,
    width: CARD_WIDTH,
    borderWidth: 1.5,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statCardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, flex: 1 },
  statCardValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  statCardSubtitle: { fontSize: 11, fontWeight: "500" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  liveText: { color: "#10B981", fontSize: 9, fontWeight: "700" },

  // Quick Actions
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  quickActionsRow: { flexDirection: "row", justifyContent: "space-between" },
  quickActionBtn: { alignItems: "center", width: (width - 64) / 4 },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center", marginBottom: 6,
  },
  quickActionLabel: { color: "#E2E8F0", fontSize: 11, fontWeight: "500", textAlign: "center" },

  // Currently Working
  emptyCard: {
    backgroundColor: "#0F1D32", borderRadius: 10, padding: 24,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40",
  },
  emptyText: { color: "#5A6A80", fontSize: 13 },
  workerCard: {
    backgroundColor: "#0F1D32", borderRadius: 10, padding: 12,
    marginBottom: 8, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#1A2A40",
  },
  workerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  workerInitial: { color: "#3B82F6", fontSize: 14, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  workerProject: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  workerTime: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  workerTimeText: { color: "#10B981", fontSize: 12, fontWeight: "500" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  viewAllText: { color: "#3B82F6", fontSize: 13, fontWeight: "500" },

  // Project Status
  projectStatusRow: { flexDirection: "row", gap: 10 },
  projectStatusCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10,
    padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  projectStatusValue: { fontSize: 24, fontWeight: "700" },
  projectStatusLabel: { color: "#8892A4", fontSize: 12, marginTop: 4 },
});
