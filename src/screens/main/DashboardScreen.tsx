import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions, Platform, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { usePermissionsStore } from "@/store/permissionsStore";
import { useLanguageStore } from "@/store/languageStore";
import { useBrandingStore } from "@/store/brandingStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;
const APP_VERSION = "v1.4.0";

// ─── Types ──────────────────────────────────────────────────────────────────
interface DashboardKPIs {
  employees: { total: number; active: number };
  projects: {
    total: number; active: number; activeBudget: number;
    readyForBilling: number; readyForBillingBudget: number;
    completed: number; completedBudget: number;
    paused: number; pausedBudget: number;
  };
  hoursThisMonth: number;
  payrollThisMonth: number;
  payrollPeriodLabel: string;
  pipeline: { total: number; approved: number; pending: number };
  expensesThisMonth: number;
  contractors: number;
  inventory: {
    totalValue: number; totalItems: number; uniqueMaterials: number;
    lowStockAlerts: number; recentEvents: number;
  };
}

interface BasicStats {
  totalEmployees: number;
  activeProjects: number;
  clockedInNow: number;
  totalProjects: number;
}

interface ActiveEntryRaw {
  entry: { id: number; clockIn: string; projectId: number | null };
  user: { id: number; name: string };
  project: { id: number; name: string } | null;
}

interface ActiveEntry {
  id: number;
  employeeName: string;
  projectName: string;
  clockInTime: string;
}

// ─── Animated Card ──────────────────────────────────────────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function GlassStatCard({
  label, value, subtitle, icon, color, live, onPress, delay, primaryColor,
}: {
  label: string; value: string; subtitle: string;
  icon: keyof typeof Ionicons.glyphMap; color: string;
  live?: boolean; onPress: () => void; delay: number;
  primaryColor: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isIOS = Platform.OS === "ios";
  const cardBg = isIOS ? `${color}10` : `${color}14`;
  const borderCol = isIOS ? `${color}28` : `${color}1A`;
  const radius = isIOS ? 20 : 24;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <AnimatedTouchable
        style={[
          styles.glassCard,
          {
            backgroundColor: cardBg,
            borderColor: borderCol,
            borderRadius: radius,
            width: CARD_WIDTH,
          },
          isIOS && styles.iosCardShadow,
          !isIOS && { elevation: 3 },
          animStyle,
        ]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        activeOpacity={0.9}
      >
        {isIOS && (
          <View style={[styles.glassEdge, { backgroundColor: `${color}18` }]} />
        )}
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          <Text style={[styles.cardLabel, { color }]} numberOfLines={1}>{label}</Text>
          {live && (
            <View style={styles.livePill}>
              <View style={styles.liveDotSmall} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={[styles.cardSubtitle, { color: `${color}BB` }]}>{subtitle}</Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { has, hasAny, isOwner, loaded: permissionsLoaded } = usePermissionsStore();
  const { labels, t } = useLanguageStore();
  const branding = useBrandingStore((s) => s.branding);
  const palette = useBrandingStore((s) => s.palette);

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayScheduleCount, setTodayScheduleCount] = useState<number>(0);

  const primaryColor = branding?.primaryColor || "#3B82F6";
  const accentColor = branding?.accentColor || "#10B981";
  const companyName = branding?.name || "CREW";
  const surfaceBg = palette?.surface || "#0A1628";
  const surfaceContainer = palette?.surfaceContainer || "#0F1D32";

  // ─── Data Fetching (preserved from original) ───────────────────────────
  const fetchDashboard = useCallback(async () => {
    const statsPromise = apiClient.get<BasicStats>("dashboard.getStats").catch(() => null);
    const kpiPromise = apiClient.get<DashboardKPIs>("reports.dashboardKPIs").catch(() => null);
    const entriesPromise = apiClient.get<ActiveEntryRaw[]>("time.getAllActive").catch(() => []);

    statsPromise.then((statsData) => {
      if (statsData) setBasicStats(statsData);
      setLoading(false);
    }).catch(() => { setLoading(false); });

    kpiPromise.then((kpiData) => {
      if (kpiData) setKpis(kpiData);
    }).catch(() => {});

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

    if (isOwner || hasAny("projects.view_all", "projects.view_assigned")) {
      const todayStr = new Date().toISOString().split("T")[0];
      apiClient.get<any[]>("scheduling.getByDateRange", { startDate: todayStr, endDate: todayStr })
        .then((schedules) => {
          if (schedules && Array.isArray(schedules)) setTodayScheduleCount(schedules.length);
        })
        .catch(() => {});
    }

    await Promise.allSettled([statsPromise, kpiPromise, entriesPromise]);
    setRefreshing(false);
  }, [isOwner]);

  useFocusEffect(
    useCallback(() => { fetchDashboard(); }, [fetchDashboard])
  );

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  // ─── Helpers ────────────────────────────────────────────────────────────
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${Math.round(value).toLocaleString()}`;
    return `$${value.toFixed(0)}`;
  };

  const formatTime = (isoString: string): string => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      const diffM = Math.floor((diffMs % 3600000) / 60000);
      if (diffH > 0) return `${diffH}h ${diffM}m`;
      return `${diffM}m`;
    } catch { return ""; }
  };

  const today = new Date();
  const dayNames = [t("days.sunday"), t("days.monday"), t("days.tuesday"), t("days.wednesday"), t("days.thursday"), t("days.friday"), t("days.saturday")];
  const monthNames = [t("months.january"), t("months.february"), t("months.march"), t("months.april"), t("months.may"), t("months.june"), t("months.july"), t("months.august"), t("months.september"), t("months.october"), t("months.november"), t("months.december")];
  const dateString = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const hour = today.getHours();
  const greetingText = t(
    hour < 12 ? "dashboard.goodMorning" : hour < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening"
  ) || (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

  const getPayrollSubtitle = (): string => {
    const label = kpis?.payrollPeriodLabel || "open";
    if (label.startsWith("since:")) return t("dashboard.openPayroll");
    if (label.startsWith("weeks:")) {
      const weeks = parseInt(label.split(":")[1]);
      return weeks === 1 ? t("dashboard.currentWeek") : `${weeks} weeks`;
    }
    return t("dashboard.currentWeek");
  };

  const firstName = (user?.name || "User").split(" ")[0];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: surfaceBg }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  // ─── Role-based Cards ─────────────────────────────────────────────────
  const allStatCards = [
    {
      id: "active-workers",
      label: t("dashboard.activeWorkers"),
      value: String(basicStats?.totalEmployees || kpis?.employees?.total || 0),
      subtitle: `${basicStats?.clockedInNow || activeEntries.length} ${t("dashboard.clockedIn") || "clocked in"}`,
      icon: "people" as const, color: primaryColor, screen: "ActiveWorkers", live: false,
      requiredPermission: ["employees.view_list", "time.view_active_workers"],
    },
    {
      id: "clock-in",
      label: t("dashboard.currentlyWorking") || t("dashboard.clockIn"),
      value: String(activeEntries.length || basicStats?.clockedInNow || 0),
      subtitle: t("dashboard.workersActive"),
      icon: "pulse" as const, color: accentColor, live: true, screen: "TimeTracking",
      requiredPermission: ["time.view_all_entries", "time.view_active_workers"],
    },
    {
      id: "payroll",
      label: t("dashboard.payroll"),
      value: formatCurrency(kpis?.payrollThisMonth || 0),
      subtitle: getPayrollSubtitle(),
      icon: "cash" as const, color: "#EF4444", screen: "Payroll", live: false,
      requiredPermission: ["payroll.view_report"],
    },
    {
      id: "active-projects",
      label: t("dashboard.activeProjects"),
      value: String(kpis?.projects?.active || basicStats?.activeProjects || 0),
      subtitle: formatCurrency(kpis?.projects?.activeBudget || 0),
      icon: "folder-open" as const, color: "#F59E0B", screen: "Projects", live: false,
      requiredPermission: ["projects.view_all", "projects.view_assigned"],
    },
    {
      id: "today-schedule",
      label: t("dashboard.todaysSchedule"),
      value: String(todayScheduleCount),
      subtitle: `job${todayScheduleCount !== 1 ? "s" : ""} today`,
      icon: "calendar" as const, color: "#14B8A6", screen: "JobSchedule", live: false,
      requiredPermission: ["projects.view_all", "projects.view_assigned"],
    },
  ];

  const statCards = allStatCards.filter((card) => {
    if (isOwner) return true;
    if (!card.requiredPermission) return true;
    return hasAny(...card.requiredPermission);
  });

  const allQuickActions = [
    { label: t("dashboard.clockInAction"), icon: "time-outline" as const, screen: "TimeTracking", color: accentColor, requiredPermission: ["time.clock_in_self"] },
    { label: labels.projects, icon: "folder-outline" as const, screen: "Projects", color: primaryColor, requiredPermission: ["projects.view_all", "projects.view_assigned"] },
    { label: labels.liveMap, icon: "map-outline" as const, screen: "LiveMap", color: "#8B5CF6", requiredPermission: ["location.view_live_map"] },
    { label: labels.estimates, icon: "calculator-outline" as const, screen: "Estimates", color: "#F59E0B", requiredPermission: ["estimates.view_list"] },
    { label: labels.myHours, icon: "clipboard-outline" as const, screen: "MyHours", color: accentColor, requiredPermission: ["time.clock_in_self"] },
    { label: labels.crewAssistant, icon: "sparkles" as const, screen: "CrewAssistant", color: "#F59E0B", requiredPermission: ["dashboard.view"] },
  ];

  const quickActions = allQuickActions.filter((action) => {
    if (isOwner) return true;
    if (!action.requiredPermission) return true;
    return hasAny(...action.requiredPermission);
  }).slice(0, 4);

  const isEmployeeView = statCards.length === 0 || (!isOwner && user?.role === "employee");
  const employeeCards = [
    { id: "my-hours", label: t("dashboard.myHoursCard"), value: "\u2014", subtitle: t("dashboard.thisWeek"), icon: "time" as const, color: primaryColor, screen: "MyHours", live: false },
    { id: "clock-in-self", label: t("dashboard.clockIn"), value: "\u2014", subtitle: t("dashboard.tapToClockIn"), icon: "pulse" as const, color: accentColor, screen: "TimeTracking", live: false },
  ];

  const showProjectStatus = isOwner || hasAny("projects.view_all");
  const projectStatus = [
    { label: labels.active, value: kpis?.projects?.active || basicStats?.activeProjects || 0, color: accentColor, filter: "active" },
    { label: t("dashboard.billing"), value: kpis?.projects?.readyForBilling || 0, color: "#F59E0B", filter: "ready_for_billing" },
    { label: labels.completed, value: kpis?.projects?.completed || 0, color: primaryColor, filter: "completed" },
  ];

  const showCurrentlyWorking = isOwner || hasAny("time.view_active_workers", "time.view_all_entries");
  const isIOS = Platform.OS === "ios";

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: surfaceBg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} colors={[primaryColor]} />
      }
    >
      {/* ── Branded Header ─────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={[
          styles.headerContainer,
          isIOS
            ? [styles.iosHeader, { backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}18` }]
            : [styles.androidHeader, { backgroundColor: surfaceContainer }],
        ]}>
          {branding?.logoUrl && (
            <Image source={{ uri: branding.logoUrl }} style={styles.logoWatermark} resizeMode="contain" />
          )}
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {branding?.logoUrl ? (
                <Image source={{ uri: branding.logoUrl }} style={styles.companyLogoSmall} resizeMode="contain" />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: `${primaryColor}25` }]}>
                  <Text style={[styles.logoInitial, { color: primaryColor }]}>{companyName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={[styles.companyNameText, { color: primaryColor }]} numberOfLines={1}>
                  {companyName.toUpperCase()}
                </Text>
                <Text style={styles.greetingText}>
                  {greetingText}, <Text style={[styles.nameHighlight, { color: primaryColor }]}>{firstName}</Text>
                </Text>
                <Text style={styles.dateText}>{dateString}</Text>
              </View>
            </View>
            <View style={[styles.avatarRing, { borderColor: `${primaryColor}50` }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: `${primaryColor}25` }]}>
                  <Text style={[styles.avatarLetter, { color: primaryColor }]}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.versionTag}>{APP_VERSION}</Text>
        </View>
      </Animated.View>

      {/* ── KPI Cards Grid ─────────────────────────────────────────────── */}
      <View style={styles.cardsGrid}>
        {(statCards.length > 0 ? statCards : employeeCards).map((card, idx) => (
          <GlassStatCard
            key={card.id}
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
            live={card.live}
            onPress={() => navigation.navigate(card.screen)}
            delay={100 + idx * 80}
            primaryColor={primaryColor}
          />
        ))}
      </View>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.quickActions}</Text>
          <View style={isIOS ? styles.quickActionsRowIOS : styles.quickActionsRowAndroid}>
            {quickActions.map((action, idx) => {
              if (isIOS) {
                return (
                  <TouchableOpacity key={idx} style={styles.quickActionBtnIOS} onPress={() => navigation.navigate(action.screen)} activeOpacity={0.7}>
                    <View style={[styles.quickActionCircle, { backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}25` }]}>
                      <Ionicons name={action.icon} size={22} color={action.color} />
                    </View>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={idx} style={[styles.quickActionPill, { backgroundColor: `${primaryColor}12`, borderColor: `${primaryColor}1A` }]} onPress={() => navigation.navigate(action.screen)} activeOpacity={0.7}>
                  <Ionicons name={action.icon} size={18} color={action.color} />
                  <Text style={styles.quickActionPillLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ── Currently Working ──────────────────────────────────────────── */}
      {showCurrentlyWorking && (
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{labels.currentlyWorking}</Text>
            <Text style={styles.sectionCount}>{activeEntries.length} {activeEntries.length === 1 ? "worker" : "workers"}</Text>
          </View>
          {activeEntries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: surfaceContainer, borderColor: palette?.outlineVariant || "#1A2A40" }]}>
              <Ionicons name="people-outline" size={24} color="#5A6A80" />
              <Text style={styles.emptyText}>{labels.noWorkersClocked}</Text>
            </View>
          ) : (
            activeEntries.slice(0, 5).map((entry, idx) => (
              <Animated.View key={entry.id} entering={FadeInRight.delay(600 + idx * 60).duration(300)}>
                <View style={[styles.workerCard, { backgroundColor: surfaceContainer, borderColor: palette?.outlineVariant || "#1A2A40" }]}>
                  <View style={[styles.workerAvatar, { backgroundColor: `${primaryColor}20` }]}>
                    <Text style={[styles.workerInitial, { color: primaryColor }]}>{(entry.employeeName || "W").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{entry.employeeName}</Text>
                    <Text style={styles.workerProject}>{entry.projectName}</Text>
                  </View>
                  <View style={styles.workerTime}>
                    <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.workerTimeText, { color: accentColor }]}>{formatTime(entry.clockInTime)}</Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
          {activeEntries.length > 5 && (
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate("ActiveWorkers")}>
              <Text style={[styles.viewAllText, { color: primaryColor }]}>{labels.viewAll} ({activeEntries.length})</Text>
              <Ionicons name="chevron-forward" size={14} color={primaryColor} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── Project Status ─────────────────────────────────────────────── */}
      {showProjectStatus && (
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.projectStatus}</Text>
          <View style={styles.projectStatusRow}>
            {projectStatus.map((status, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.projectStatusCard, {
                  backgroundColor: isIOS ? `${status.color}0C` : `${status.color}12`,
                  borderColor: `${status.color}25`,
                  borderRadius: isIOS ? 16 : 20,
                }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Projects", { statusFilter: status.filter })}
              >
                <Text style={[styles.projectStatusValue, { color: status.color }]}>{status.value}</Text>
                <Text style={styles.projectStatusLabel}>{status.label}</Text>
                <Ionicons name="chevron-forward" size={12} color="#5A6A80" style={{ marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  headerContainer: { marginHorizontal: 16, marginTop: 12, marginBottom: 20, padding: 20, overflow: "hidden" },
  iosHeader: { borderRadius: 24, borderWidth: 1 },
  androidHeader: { borderRadius: 28, elevation: 3 },
  logoWatermark: { position: "absolute", right: -20, top: -10, width: 120, height: 120, opacity: 0.06 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  companyLogoSmall: { width: 42, height: 42, borderRadius: 12 },
  logoPlaceholder: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  logoInitial: { fontSize: 22, fontWeight: "800" },
  headerText: { flex: 1 },
  companyNameText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 2 },
  greetingText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  nameHighlight: { fontWeight: "800" },
  dateText: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  versionTag: { color: "#5A6A80", fontSize: 10, fontWeight: "500", marginTop: 8 },
  avatarRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, overflow: "hidden", marginLeft: 12 },
  avatar: { width: "100%", height: "100%", borderRadius: 23 },
  avatarFallback: { width: "100%", height: "100%", borderRadius: 23, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 18, fontWeight: "700" },

  // Cards Grid
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  glassCard: { padding: 16, borderWidth: 1, overflow: "hidden" },
  iosCardShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  glassEdge: { position: "absolute", top: 0, left: 0, right: 0, height: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 },
  iconCircle: { width: 24, height: 24, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, flex: 1, textTransform: "uppercase" },
  cardValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  cardSubtitle: { fontSize: 11, fontWeight: "500" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#10B98120", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#10B981" },
  liveLabel: { color: "#10B981", fontSize: 8, fontWeight: "700" },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sectionCount: { color: "#8892A4", fontSize: 12, marginBottom: 12 },

  // Quick Actions
  quickActionsRowIOS: { flexDirection: "row", justifyContent: "space-between" },
  quickActionsRowAndroid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickActionBtnIOS: { alignItems: "center", width: (width - 80) / 4 },
  quickActionCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  quickActionLabel: { color: "#8892A4", fontSize: 11, fontWeight: "500", textAlign: "center" },
  quickActionPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5, gap: 6 },
  quickActionPillLabel: { color: "#E0E0E0", fontSize: 12, fontWeight: "600" },

  // Workers
  emptyCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 8, borderWidth: 1 },
  emptyText: { color: "#5A6A80", fontSize: 13 },
  workerCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1 },
  workerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 10 },
  workerInitial: { fontSize: 14, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerName: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  workerProject: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  workerTime: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  workerTimeText: { fontSize: 12, fontWeight: "500" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  viewAllText: { fontSize: 13, fontWeight: "500" },

  // Project Status
  projectStatusRow: { flexDirection: "row", justifyContent: "space-between" },
  projectStatusCard: { padding: 16, alignItems: "center", flex: 1, marginHorizontal: 4, borderWidth: 1 },
  projectStatusValue: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  projectStatusLabel: { color: "#8892A4", fontSize: 11, fontWeight: "500" },
});
