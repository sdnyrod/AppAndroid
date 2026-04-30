import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

interface DashboardData {
  activeWorkers: number;
  totalProjects: number;
  activeProjects: number;
  totalEmployees: number;
  todayHours: number;
  weekHours: number;
}

interface ActiveWorker {
  id: number;
  user?: { name: string };
  project?: { name: string };
  clockIn: string;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardData>({
    activeWorkers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalEmployees: 0,
    todayHours: 0,
    weekHours: 0,
  });
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      // Get active time entries (who's clocked in now)
      const activeRes = await apiClient("/api/trpc/time.getAllActive", "GET");
      const activeEntries = activeRes?.result?.data || [];
      setActiveWorkers(activeEntries);

      // Get projects
      const projectsRes = await apiClient("/api/trpc/project.getAll", "GET");
      const projects = projectsRes?.result?.data || [];
      const activeProjects = projects.filter((p: any) => p.status === "active");

      // Get employees
      const employeesRes = await apiClient("/api/trpc/employee.getAll", "GET");
      const employees = employeesRes?.result?.data || [];

      setStats({
        activeWorkers: activeEntries.length,
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalEmployees: employees.length,
        todayHours: 0, // Will be calculated from entries
        weekHours: 0,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const getElapsed = (clockIn: string) => {
    const diff = Date.now() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statPrimary]}>
          <Ionicons name="people" size={24} color="#2563EB" />
          <Text style={styles.statValue}>{stats.activeWorkers}</Text>
          <Text style={styles.statLabel}>Working Now</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="construct" size={24} color="#22C55E" />
          <Text style={styles.statValue}>{stats.activeProjects}</Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="person" size={24} color="#8B5CF6" />
          <Text style={styles.statValue}>{stats.totalEmployees}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="folder" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.totalProjects}</Text>
          <Text style={styles.statLabel}>Total Projects</Text>
        </View>
      </View>

      {/* Active Workers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Currently Working</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{activeWorkers.length}</Text>
          </View>
        </View>

        {activeWorkers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>No one clocked in right now</Text>
          </View>
        ) : (
          activeWorkers.slice(0, 10).map((worker, idx) => (
            <View key={worker.id || idx} style={styles.workerRow}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerInitial}>
                  {(worker.user?.name || "?").charAt(0)}
                </Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>
                  {worker.user?.name || "Unknown"}
                </Text>
                <Text style={styles.workerProject}>
                  {worker.project?.name || "—"}
                </Text>
              </View>
              <Text style={styles.workerTime}>{getElapsed(worker.clockIn)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    width: "47%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statPrimary: {
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFF",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  workerInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  workerProject: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  workerTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
});
