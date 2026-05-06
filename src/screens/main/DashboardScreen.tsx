import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface DashboardStats {
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashStats, entries] = await Promise.all([
        apiClient.get<DashboardStats>("dashboard.getStats"),
        apiClient.get<any[]>("time.getActiveEntries").catch(() => []),
      ]);
      setStats(dashStats);
      if (entries && Array.isArray(entries)) {
        setActiveEntries(
          entries.map((entry: any) => ({
            id: entry.id,
            employeeName: entry.user?.name || entry.userName || entry.employeeName || "Worker",
            projectName: entry.project?.name || entry.projectName || "No project",
            clockInTime: entry.clockIn || entry.clockInTime || "",
          }))
        );
        // Calculate today's hours from active entries
        let totalMinutes = 0;
        entries.forEach((entry: any) => {
          const clockIn = new Date(entry.clockIn || entry.clockInTime);
          const now = new Date();
          totalMinutes += (now.getTime() - clockIn.getTime()) / 60000;
        });
        setTodayHours(Math.round(totalMinutes / 60 * 10) / 10);
      }
    } catch (e) {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  // Stats cards data
  const statCards = [
    { label: "Active Workers", value: stats?.clockedInNow || 0, icon: "people", color: "#3B82F6", borderColor: "#1D4ED8" },
    { label: "Clock In LIVE", value: activeEntries.length, icon: "radio", color: "#10B981", borderColor: "#059669" },
    { label: "Today's Hours", value: `${todayHours}h`, icon: "time", color: "#8B5CF6", borderColor: "#7C3AED" },
    { label: "Payroll", value: stats?.totalEmployees || 0, icon: "cash", color: "#F59E0B", borderColor: "#D97706" },
    { label: "Active Projects", value: stats?.activeProjects || 0, icon: "folder-open", color: "#06B6D4", borderColor: "#0891B2" },
    { label: "Pipeline", value: stats?.totalProjects || 0, icon: "layers", color: "#EC4899", borderColor: "#DB2777" },
    { label: "Today's Schedule", value: activeEntries.length, icon: "calendar", color: "#14B8A6", borderColor: "#0D9488" },
    { label: "Contractors", value: "\u2014", icon: "construct", color: "#F97316", borderColor: "#EA580C" },
  ];

  // Quick Actions
  const quickActions = [
    { label: "Clock In", icon: "time-outline", screen: "TimeTracking", color: "#10B981" },
    { label: "Projects", icon: "folder-outline", screen: "Projects", color: "#3B82F6" },
    { label: "Live Map", icon: "map-outline", screen: "LiveMap", color: "#8B5CF6" },
    { label: "Estimates", icon: "calculator-outline", screen: "Estimates", color: "#F59E0B" },
  ];

  // Project Status
  const projectStatus = [
    { label: "Active", value: stats?.activeProjects || 0, color: "#10B981" },
    { label: "Billing", value: 0, color: "#F59E0B" },
    { label: "Completed", value: (stats?.totalProjects || 0) - (stats?.activeProjects || 0), color: "#3B82F6" },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Version Label */}
      <Text style={styles.testVersionLabel}>V. Teste 10</Text>

      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || "User"}</Text>
      </View>

      {/* 8 Stat Cards - 2x4 grid */}
      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <View key={idx} style={[styles.statCard, { borderLeftColor: card.borderColor, borderLeftWidth: 3 }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name={card.icon as any} size={18} color={card.color} />
              <Text style={styles.statValue}>{card.value}</Text>
            </View>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + "20" }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Currently Working */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currently Working</Text>
        {activeEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={24} color="#5A6A80" />
            <Text style={styles.emptyText}>No workers clocked in</Text>
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
            <Text style={styles.viewAllText}>View All ({activeEntries.length})</Text>
            <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Project Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Status</Text>
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
  testVersionLabel: { color: "#EF4444", fontSize: 11, fontWeight: "700", textAlign: "center", paddingTop: 8, letterSpacing: 1 },
  welcomeSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  welcomeText: { color: "#8892A4", fontSize: 14 },
  userName: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: 2 },

  // Stats Grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 14,
    width: CARD_WIDTH,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  statCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#8892A4", fontSize: 11, marginTop: 6 },

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
