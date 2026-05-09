import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import SearchableSelect from "@/components/SearchableSelect";

import { useLanguageStore } from "@/store/languageStore";
type JobCostRouteParams = {
  JobCost: {
    projectId?: number;
  };
};

interface Project {
  id: number;
  name: string;
  status: string;
}

// The API returns DIFFERENT shapes depending on estimate type:
// - lump_sum: { estimateType, contractValue, costBreakdown, totalCosts, grossProfit, marginPercent, workerBreakdown, materials, otherCosts, ... }
// - detailed: { materials, labor, workerBreakdown, otherCosts, fleet, summary: { estimatedTotal, actualTotal, variance }, source }
// We normalize both into a unified display model.

interface WorkerBreakdownItem {
  workerId: number;
  workerName: string;
  hours: number;
  daysWorked: number;
  hourlyRate: number;
  payType: string;
  totalCost: number;
  entries: number;
  payRate?: number;
  rateSource?: string;
}

interface NormalizedCostData {
  contractValue: number;
  actualCost: number;
  laborCost: number;
  materialsCost: number;
  otherCost: number;
  margin: number;
  marginPercent: string;
  budgetUsed: number;
  workerBreakdown: WorkerBreakdownItem[];
  source: string;
}

function normalizeApiResponse(raw: Record<string, any>): NormalizedCostData {
  // LUMP SUM format
  if (raw.estimateType === "lump_sum" || raw.contractValue !== undefined) {
    const contractValue = Number(raw.contractValue || 0);
    const totalCosts = Number(raw.totalCosts || 0);
    const laborCost = Number(raw.costBreakdown?.labor || 0);
    const materialsCost = Number(raw.costBreakdown?.materials || 0);
    const fleetCost = Number(raw.costBreakdown?.fleet || 0);
    const otherCost = Number(raw.costBreakdown?.other || 0) + fleetCost;
    const margin = contractValue - totalCosts;
    const marginPercent = contractValue > 0 ? ((margin / contractValue) * 100).toFixed(1) : "0";
    const budgetUsed = contractValue > 0 ? Math.min((totalCosts / contractValue) * 100, 100) : 0;

    return {
      contractValue,
      actualCost: totalCosts,
      laborCost,
      materialsCost,
      otherCost,
      margin,
      marginPercent,
      budgetUsed,
      workerBreakdown: (raw.workerBreakdown || []) as WorkerBreakdownItem[],
      source: "lump_sum",
    };
  }

  // DETAILED format (original structure with summary)
  const contractValue = Number(raw.summary?.estimatedTotal || 0);
  const actualCost = Number(raw.summary?.actualTotal || 0);
  const laborCost = (raw.labor || []).reduce((s: number, l: any) => s + Number(l.actualCost || 0), 0);
  const materialsCost = (raw.materials || []).reduce((s: number, m: any) => s + Number(m.actualTotal || 0), 0);
  const fleetCost = (raw.fleet || []).reduce((s: number, f: any) => s + Number(f.totalCost || 0), 0);
  const otherCost = (raw.otherCosts || []).reduce((s: number, o: any) => s + Number(o.actualAmount || 0), 0) + fleetCost;
  const margin = contractValue - actualCost;
  const marginPercent = contractValue > 0 ? ((margin / contractValue) * 100).toFixed(1) : "0";
  const budgetUsed = contractValue > 0 ? Math.min((actualCost / contractValue) * 100, 100) : 0;

  return {
    contractValue,
    actualCost,
    laborCost,
    materialsCost,
    otherCost,
    margin,
    marginPercent,
    budgetUsed,
    workerBreakdown: (raw.workerBreakdown || []) as WorkerBreakdownItem[],
    source: raw.source || "detailed",
  };
}

export default function JobCostScreen() {
  const { t } = useLanguageStore();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<JobCostRouteParams, "JobCost">>();
  const initialProjectId = route.params?.projectId ?? null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId);
  const [costData, setCostData] = useState<NormalizedCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCost, setLoadingCost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      // Show ALL projects (active + completed) so user can check cost for any
      const allProjects = (data || []).filter((p) => p.status === "active" || p.status === "completed");
      setProjects(allProjects);
      if (allProjects.length > 0 && !selectedProjectId && !initialProjectId) {
        setSelectedProjectId(allProjects[0].id);
      } else if (initialProjectId && !selectedProjectId) {
        // Ensure the initial project from navigation params is selected
        setSelectedProjectId(initialProjectId);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCostData = useCallback(async (projectId: number) => {
    setLoadingCost(true);
    try {
      const rawData = await apiClient.get<Record<string, any>>("reports.jobCostDetail", { projectId });
      if (rawData) {
        const normalized = normalizeApiResponse(rawData);
        setCostData(normalized);
      } else {
        setCostData(null);
      }
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

  // Use normalized data directly
  const contractValue = costData?.contractValue || 0;
  const actualCost = costData?.actualCost || 0;
  const laborCost = costData?.laborCost || 0;
  const materialsCost = costData?.materialsCost || 0;
  const otherCost = costData?.otherCost || 0;
  const margin = costData?.margin || 0;
  const marginPercent = costData?.marginPercent || "0";
  const budgetUsed = costData?.budgetUsed || 0;

  // Cost breakdown percentages for display
  const totalBreakdown = laborCost + materialsCost + otherCost;
  const laborPct = totalBreakdown > 0 ? (laborCost / totalBreakdown * 100).toFixed(0) : "0";
  const materialsPct = totalBreakdown > 0 ? (materialsCost / totalBreakdown * 100).toFixed(0) : "0";
  const otherPct = totalBreakdown > 0 ? (otherCost / totalBreakdown * 100).toFixed(0) : "0";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Project Search Selector */}
      <SearchableSelect
        items={projects.map((p) => ({ id: p.id, name: p.name, subtitle: p.status }))}
        selectedId={selectedProjectId}
        onSelect={(item) => setSelectedProjectId(item.id)}
        onClear={() => setSelectedProjectId(null)}
        placeholder={t("time.searchProject")}
        icon="business-outline"
        iconColor="#3B82F6"
        label={t("common.job")}
      />

      {loadingCost ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>{t("jobCost.loadingCostData")}</Text>
        </View>
      ) : !costData || (costData.contractValue === 0 && costData.actualCost === 0) ? (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={32} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("jobCost.noCostData")}</Text>
        </View>
      ) : (
        <>
          {/* Budget Used Progress Bar */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>{t("jobCost.budgetUsed")}</Text>
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
              <Text style={styles.budgetLabel}>{formatCurrency(actualCost)} {t("jobCost.spent")}</Text>
              <Text style={styles.budgetLabel}>{formatCurrency(contractValue)} {t("jobCost.budget")}</Text>
            </View>
          </View>

          {/* Metric Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.contractValue")}</Text>
              <Text style={[styles.metricValue, { color: "#3B82F6" }]}>{formatCurrency(contractValue)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.actualCost")}</Text>
              <Text style={[styles.metricValue, { color: "#F59E0B" }]}>{formatCurrency(actualCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.laborCost")}</Text>
              <Text style={[styles.metricValue, { color: "#8B5CF6" }]}>{formatCurrency(laborCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.margin")}</Text>
              <Text style={[styles.metricValue, { color: margin >= 0 ? "#10B981" : "#EF4444" }]}>
                {formatCurrency(margin)} ({marginPercent}%)
              </Text>
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("jobCost.costBreakdown")}</Text>
            <View style={styles.breakdownCard}>
              {/* Labor */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.breakdownName}>{t("jobCost.labor")}</Text>
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
                  <Text style={styles.breakdownName}>{t("jobCost.materials")}</Text>
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
                  <Text style={styles.breakdownName}>{t("jobCost.other")}</Text>
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
              <Text style={styles.sectionTitle}>{t("jobCost.workerBreakdown")}</Text>
              {costData.workerBreakdown.map((worker: WorkerBreakdownItem) => (
                <View key={worker.workerId} style={styles.workerRow}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitial}>{(worker.workerName || "W").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{worker.workerName}</Text>
                    <Text style={styles.workerMeta}>
                      {Number(worker.hours || 0).toFixed(1)}h · {worker.daysWorked}d · ${Number(worker.hourlyRate || worker.payRate || 0).toFixed(0)}/{worker.payType === "daily" ? "day" : worker.payType === "weekly" ? "wk" : "hr"}
                    </Text>
                  </View>
                  <Text style={styles.workerCost}>{formatCurrency(Number(worker.totalCost || 0))}</Text>
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
