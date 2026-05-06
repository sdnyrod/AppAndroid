import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useNavigation } from "@react-navigation/native";

interface Project {
  id: number;
  name: string;
  status: string;
}

interface JobCostData {
  materials: any[];
  labor: any[];
  workerBreakdown: {
    workerId: number;
    workerName: string;
    hours: number;
    daysWorked: number;
    hourlyRate: number;
    payType: string;
    totalCost: number;
    entries: number;
  }[];
  otherCosts: any[];
  fleet: any[];
  summary: {
    estimatedTotal: number;
    actualTotal: number;
    variance: number;
  };
  source: string;
}

export default function JobCostScreen() {
  const navigation = useNavigation<any>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [costData, setCostData] = useState<JobCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCost, setLoadingCost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      const activeProjects = (data || []).filter((p) => p.status === "active");
      setProjects(activeProjects);
      if (activeProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(activeProjects[0].id);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCostData = useCallback(async (projectId: number) => {
    setLoadingCost(true);
    try {
      const data = await apiClient.get<JobCostData>("reports.jobCostDetail", { projectId });
      setCostData(data);
    } catch {
      setCostData(null);
    } finally {
      setLoadingCost(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    if (selectedProjectId) { fetchCostData(selectedProjectId); }
  }, [selectedProjectId, fetchCostData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
    if (selectedProjectId) fetchCostData(selectedProjectId);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const formatCurrency = (val: number) => {
    return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Calculate derived values
  const contractValue = costData?.summary?.estimatedTotal || 0;
  const actualCost = costData?.summary?.actualTotal || 0;
  const laborCost = costData?.labor?.reduce((s, l) => s + (l.actualCost || 0), 0) || 0;
  const materialsCost = costData?.materials?.reduce((s, m) => s + (m.actualTotal || 0), 0) || 0;
  const otherCost = (costData?.otherCosts?.reduce((s, o) => s + (o.actualAmount || 0), 0) || 0) +
    (costData?.fleet?.reduce((s, f) => s + (f.totalCost || 0), 0) || 0);
  const margin = contractValue - actualCost;
  const marginPercent = contractValue > 0 ? ((margin / contractValue) * 100).toFixed(1) : "0";
  const budgetUsed = contractValue > 0 ? Math.min((actualCost / contractValue) * 100, 100) : 0;

  // Cost breakdown for display
  const totalBreakdown = laborCost + materialsCost + otherCost;
  const laborPct = totalBreakdown > 0 ? (laborCost / totalBreakdown * 100).toFixed(0) : "0";
  const materialsPct = totalBreakdown > 0 ? (materialsCost / totalBreakdown * 100).toFixed(0) : "0";
  const otherPct = totalBreakdown > 0 ? (otherCost / totalBreakdown * 100).toFixed(0) : "0";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Project Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelector} contentContainerStyle={styles.projectSelectorContent}>
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={[styles.projectTab, selectedProjectId === project.id && styles.projectTabActive]}
            onPress={() => setSelectedProjectId(project.id)}
          >
            <Text style={[styles.projectTabText, selectedProjectId === project.id && styles.projectTabTextActive]} numberOfLines={1}>
              {project.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadingCost ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading cost data...</Text>
        </View>
      ) : !costData ? (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={32} color="#5A6A80" />
          <Text style={styles.emptyText}>No cost data available for this project</Text>
        </View>
      ) : (
        <>
          {/* Budget Used Progress Bar */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Budget Used</Text>
              <Text style={styles.budgetPercent}>{budgetUsed.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min(budgetUsed, 100)}%` },
                budgetUsed > 90 ? styles.progressDanger : budgetUsed > 70 ? styles.progressWarning : styles.progressNormal,
              ]} />
            </View>
            <View style={styles.budgetLabels}>
              <Text style={styles.budgetLabel}>{formatCurrency(actualCost)} spent</Text>
              <Text style={styles.budgetLabel}>{formatCurrency(contractValue)} budget</Text>
            </View>
          </View>

          {/* Metric Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Contract Value</Text>
              <Text style={[styles.metricValue, { color: "#3B82F6" }]}>{formatCurrency(contractValue)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Actual Cost</Text>
              <Text style={[styles.metricValue, { color: "#F59E0B" }]}>{formatCurrency(actualCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Labor Cost</Text>
              <Text style={[styles.metricValue, { color: "#8B5CF6" }]}>{formatCurrency(laborCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Margin</Text>
              <Text style={[styles.metricValue, { color: margin >= 0 ? "#10B981" : "#EF4444" }]}>
                {formatCurrency(margin)} ({marginPercent}%)
              </Text>
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
            <View style={styles.breakdownCard}>
              {/* Labor */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.breakdownName}>Labor</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{formatCurrency(laborCost)}</Text>
                  <Text style={styles.breakdownPct}>{laborPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${laborPct}%` as unknown as number, backgroundColor: "#3B82F6" }]} />
              </View>

              {/* Materials */}
              <View style={[styles.breakdownRow, { marginTop: 14 }]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.breakdownName}>Materials</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{formatCurrency(materialsCost)}</Text>
                  <Text style={styles.breakdownPct}>{materialsPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${materialsPct}%` as unknown as number, backgroundColor: "#10B981" }]} />
              </View>

              {/* Other */}
              <View style={[styles.breakdownRow, { marginTop: 14 }]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.breakdownName}>Other</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{formatCurrency(otherCost)}</Text>
                  <Text style={styles.breakdownPct}>{otherPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${otherPct}%` as unknown as number, backgroundColor: "#F59E0B" }]} />
              </View>
            </View>
          </View>

          {/* Worker Breakdown */}
          {costData.workerBreakdown && costData.workerBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Worker Breakdown</Text>
              {costData.workerBreakdown.map((worker) => (
                <View key={worker.workerId} style={styles.workerRow}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitial}>{(worker.workerName || "W").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{worker.workerName}</Text>
                    <Text style={styles.workerMeta}>
                      {worker.hours.toFixed(1)}h · {worker.daysWorked}d · ${worker.hourlyRate.toFixed(0)}/{worker.payType === "daily" ? "day" : "hr"}
                    </Text>
                  </View>
                  <Text style={styles.workerCost}>{formatCurrency(worker.totalCost)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Project Selector
  projectSelector: { maxHeight: 50, marginTop: 8 },
  projectSelectorContent: { paddingHorizontal: 16, gap: 8 },
  projectTab: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40", marginRight: 8,
  },
  projectTabActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  projectTabText: { color: "#8892A4", fontSize: 13, fontWeight: "500" },
  projectTabTextActive: { color: "#FFFFFF", fontWeight: "600" },

  // Loading
  loadingSection: { alignItems: "center", paddingVertical: 40, gap: 8 },
  loadingText: { color: "#8892A4", fontSize: 13 },

  // Empty
  emptyCard: {
    margin: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 32,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40",
  },
  emptyText: { color: "#5A6A80", fontSize: 14 },

  // Budget Section
  budgetSection: { margin: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  budgetTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  budgetPercent: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  progressBar: { height: 8, backgroundColor: "#1A2A40", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressNormal: { backgroundColor: "#10B981" },
  progressWarning: { backgroundColor: "#F59E0B" },
  progressDanger: { backgroundColor: "#EF4444" },
  budgetLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetLabel: { color: "#8892A4", fontSize: 11 },

  // Metrics Grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  metricCard: {
    width: "48%", backgroundColor: "#0F1D32", borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: "#1A2A40",
  },
  metricLabel: { color: "#8892A4", fontSize: 11, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "700" },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 12 },

  // Cost Breakdown
  breakdownCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownName: { color: "#E2E8F0", fontSize: 13, fontWeight: "500" },
  breakdownRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  breakdownPct: { color: "#8892A4", fontSize: 11, width: 32, textAlign: "right" },
  breakdownBarBg: { height: 4, backgroundColor: "#1A2A40", borderRadius: 2, marginTop: 6, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 2 },

  // Worker Breakdown
  workerRow: {
    flexDirection: "row", alignItems: "center", padding: 12,
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  workerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  workerInitial: { color: "#3B82F6", fontSize: 13, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerName: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  workerMeta: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  workerCost: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
