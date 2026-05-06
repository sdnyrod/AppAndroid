import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

interface ActiveEntry {
  id: number;
  employeeName: string;
  projectName: string;
  clockInTime: string;
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const active = await apiClient.get<any[]>("time.getAllActive");
      const employees = await apiClient.get<any[]>("users.getEmployees");
      const projects = await apiClient.get<any[]>("projects.list");

      setActiveWorkers(active?.length || 0);
      setTotalEmployees(employees?.length || 0);
      setActiveProjects(projects?.filter((p: any) => p.status === "active")?.length || projects?.length || 0);

      if (active && Array.isArray(active)) {
        setActiveEntries(
          active.slice(0, 10).map((entry: any) => ({
            id: entry.id,
            employeeName: entry.employeeName || entry.employee?.name || "Unknown",
            projectName: entry.projectName || entry.project?.name || "No project",
            clockInTime: entry.clockIn || entry.clockInTime || "",
          }))
        );
      }
    } catch (e) {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      <Text style={styles.testVersionLabel}>  V. Teste 10</Text>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || "User"}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={22} color="#3B82F6" />
          <Text style={styles.statValue}>{activeWorkers}</Text>
          <Text style={styles.statLabel}>Active Now</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="person" size={22} color="#10B981" />
          <Text style={styles.statValue}>{totalEmployees}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="folder-open" size={22} color="#F59E0B" />
          <Text style={styles.statValue}>{activeProjects}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={22} color="#8B5CF6" />
          <Text style={styles.statValue}>0h</Text>
          <Text style={styles.statLabel}>Today Hours</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currently Clocked In</Text>
        {activeEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={24} color="#5A6A80" />
            <Text style={styles.emptyText}>No workers clocked in</Text>
          </View>
        ) : (
          activeEntries.map((entry) => (
            <View key={entry.id} style={styles.workerCard}>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{entry.employeeName}</Text>
                <Text style={styles.workerProject}>{entry.projectName}</Text>
              </View>
              <View style={styles.workerTime}>
                <Ionicons name="time-outline" size={14} color="#10B981" />
                <Text style={styles.workerTimeText}>{formatTime(entry.clockInTime)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  testVersionLabel: { color: "#EF4444", fontSize: 11, fontWeight: "700", textAlign: "center", paddingTop: 8, letterSpacing: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  welcomeSection: { padding: 20, paddingBottom: 8 },
  welcomeText: { color: "#8892A4", fontSize: 14 },
  userName: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, width: "48%", borderWidth: 1, borderColor: "#1A2A40", gap: 6 },
  statValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  statLabel: { color: "#8892A4", fontSize: 12 },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  emptyCard: { backgroundColor: "#0F1D32", borderRadius: 10, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40" },
  emptyText: { color: "#5A6A80", fontSize: 13 },
  workerCard: { backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#1A2A40" },
  workerInfo: { flex: 1 },
  workerName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  workerProject: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  workerTime: { flexDirection: "row", alignItems: "center", gap: 4 },
  workerTimeText: { color: "#10B981", fontSize: 12, fontWeight: "500" },
});
