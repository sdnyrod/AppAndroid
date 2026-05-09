import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

import { useLanguageStore } from "@/store/languageStore";
interface EstimateItem {
  estimate: {
    id: number;
    projectId: number;
    workTypeId?: number | null;
    estimateNumber: string;
    estimateType: string;
    status: string;
    estimateDate?: string | null;
    validUntil?: string | null;
    marginPercentage?: string;
    marginAmount?: string;
    totalMaterials?: string;
    totalLabor?: string;
    totalOther?: string;
    totalCost?: string;
    proposalValue?: string;
    title?: string | null;
    discountType?: string | null;
    discountValue?: string;
    discountAmount?: string;
    taxRate?: string;
    taxAmount?: string;
    scopeOfWork?: string | null;
    notes?: string | null;
    createdAt?: string;
  };
  project: {
    id: number;
    name: string;
    address?: string;
    clientName?: string;
    status?: string;
  };
}

interface EstimateDetail {
  estimate: EstimateItem["estimate"];
  project: EstimateItem["project"];
  materials?: Array<{
    id: number;
    materialName?: string;
    quantity?: string;
    unitCost?: string;
    totalCost?: string;
    unit?: string;
  }>;
  labor?: Array<{
    id: number;
    roleName?: string;
    workers?: number;
    days?: number;
    ratePerDay?: string;
    totalCost?: string;
  }>;
  otherCosts?: Array<{
    id: number;
    description?: string;
    amount?: string;
    category?: string;
  }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#1E3A5F", text: "#93C5FD" },
  sent: { bg: "#1E3A5F", text: "#60A5FA" },
  approved: { bg: "#064E3B", text: "#6EE7B7" },
  rejected: { bg: "#7F1D1D", text: "#FCA5A5" },
  expired: { bg: "#44403C", text: "#A8A29E" },
  converted: { bg: "#312E81", text: "#A5B4FC" },
};

function formatCurrency(value?: string | null): string {
  if (!value) return "$0.00";
  const num = parseFloat(value);
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function EstimatesScreen() {
  const { t } = useLanguageStore();
  const [estimates, setEstimates] = useState<EstimateItem[]>([]);
  const [filtered, setFiltered] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get<EstimateItem[]>("estimates.list");
      const list = data || [];
      setEstimates(list);
      setFiltered(list);
    } catch {
      // Network error — keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(estimates);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      estimates.filter(
        (item) =>
          (item.estimate.estimateNumber || "").toLowerCase().includes(q) ||
          (item.estimate.title || "").toLowerCase().includes(q) ||
          (item.project.name || "").toLowerCase().includes(q) ||
          (item.project.clientName || "").toLowerCase().includes(q)
      )
    );
  }, [search, estimates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openDetail = async (estimateId: number) => {
    setDetailLoading(true);
    try {
      const detail = await apiClient.get<EstimateDetail>("estimates.getById", { id: estimateId });
      if (detail) {
        setSelectedEstimate(detail);
      }
    } catch {
      // Failed to load detail
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#5A6A80" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("estimates.search")}
          placeholderTextColor="#5A6A80"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{filtered.length} estimate{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.estimate.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const est = item.estimate;
          const proj = item.project;
          const statusStyle = STATUS_COLORS[est.status] || STATUS_COLORS.draft;

          return (
            <TouchableOpacity style={styles.card} onPress={() => openDetail(est.id)} activeOpacity={0.7}>
              {/* Header Row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.estimateNumber}>{est.estimateNumber}</Text>
                  {est.title && <Text style={styles.estimateTitle} numberOfLines={1}>{est.title}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>{est.status}</Text>
                </View>
              </View>

              {/* Project Info */}
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={14} color="#5A6A80" />
                  <Text style={styles.infoText} numberOfLines={1}>{proj.name}</Text>
                </View>
                {proj.clientName && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color="#5A6A80" />
                    <Text style={styles.infoText}>{proj.clientName}</Text>
                  </View>
                )}
                {est.estimateDate && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#5A6A80" />
                    <Text style={styles.infoText}>{formatDate(est.estimateDate)}</Text>
                  </View>
                )}
              </View>

              {/* Footer - Totals */}
              <View style={styles.cardFooter}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Cost</Text>
                  <Text style={styles.totalValue}>{formatCurrency(est.totalCost)}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalLabel}>Proposal</Text>
                  <Text style={styles.proposalValue}>{formatCurrency(est.proposalValue)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#5A6A80" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calculator-outline" size={48} color="#5A6A80" />
            <Text style={styles.emptyText}>No estimates found</Text>
          </View>
        }
      />

      {/* Loading overlay for detail fetch */}
      {detailLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedEstimate} animationType="slide" transparent={false}>
        {selectedEstimate && (
          <EstimateDetailView
            detail={selectedEstimate}
            onClose={() => setSelectedEstimate(null)}
          />
        )}
      </Modal>
    </View>
  );
}

// ============================================================================
// ESTIMATE DETAIL VIEW
// ============================================================================

function EstimateDetailView({ detail, onClose }: { detail: EstimateDetail; onClose: () => void }) {
  const est = detail.estimate;
  const proj = detail.project;
  const statusStyle = STATUS_COLORS[est.status] || STATUS_COLORS.draft;

  return (
    <View style={detailStyles.container}>
      {/* Header */}
      <View style={detailStyles.header}>
        <TouchableOpacity onPress={onClose} style={detailStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={detailStyles.headerTitle}>Estimate Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={detailStyles.scrollView} contentContainerStyle={detailStyles.scrollContent}>
        {/* Estimate Header Card */}
        <View style={detailStyles.card}>
          <View style={detailStyles.cardRow}>
            <Text style={detailStyles.estimateNumber}>{est.estimateNumber}</Text>
            <View style={[detailStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[detailStyles.statusText, { color: statusStyle.text }]}>{est.status}</Text>
            </View>
          </View>
          {est.title && <Text style={detailStyles.title}>{est.title}</Text>}
          <Text style={detailStyles.type}>Type: {est.estimateType === "lump_sum" ? "Lump Sum" : "Detailed"}</Text>
        </View>

        {/* Project Info */}
        <View style={detailStyles.card}>
          <Text style={detailStyles.sectionTitle}>Project</Text>
          <Text style={detailStyles.projectName}>{proj.name}</Text>
          {proj.clientName && <Text style={detailStyles.infoText}>Client: {proj.clientName}</Text>}
          {proj.address && <Text style={detailStyles.infoText}>Address: {proj.address}</Text>}
        </View>

        {/* Dates */}
        <View style={detailStyles.card}>
          <Text style={detailStyles.sectionTitle}>Dates</Text>
          <View style={detailStyles.dateRow}>
            <View style={detailStyles.dateItem}>
              <Text style={detailStyles.dateLabel}>Estimate Date</Text>
              <Text style={detailStyles.dateValue}>{formatDate(est.estimateDate)}</Text>
            </View>
            <View style={detailStyles.dateItem}>
              <Text style={detailStyles.dateLabel}>Valid Until</Text>
              <Text style={detailStyles.dateValue}>{formatDate(est.validUntil)}</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={detailStyles.card}>
          <Text style={detailStyles.sectionTitle}>Financial Summary</Text>
          <View style={detailStyles.financialRow}>
            <Text style={detailStyles.financialLabel}>Materials</Text>
            <Text style={detailStyles.financialValue}>{formatCurrency(est.totalMaterials)}</Text>
          </View>
          <View style={detailStyles.financialRow}>
            <Text style={detailStyles.financialLabel}>Labor</Text>
            <Text style={detailStyles.financialValue}>{formatCurrency(est.totalLabor)}</Text>
          </View>
          <View style={detailStyles.financialRow}>
            <Text style={detailStyles.financialLabel}>Other Costs</Text>
            <Text style={detailStyles.financialValue}>{formatCurrency(est.totalOther)}</Text>
          </View>
          <View style={detailStyles.divider} />
          <View style={detailStyles.financialRow}>
            <Text style={detailStyles.financialLabel}>Total Cost</Text>
            <Text style={detailStyles.financialValueBold}>{formatCurrency(est.totalCost)}</Text>
          </View>
          {est.marginPercentage && parseFloat(est.marginPercentage) > 0 && (
            <View style={detailStyles.financialRow}>
              <Text style={detailStyles.financialLabel}>Margin ({est.marginPercentage}%)</Text>
              <Text style={detailStyles.financialValue}>{formatCurrency(est.marginAmount)}</Text>
            </View>
          )}
          {est.discountAmount && parseFloat(est.discountAmount) > 0 && (
            <View style={detailStyles.financialRow}>
              <Text style={[detailStyles.financialLabel, { color: "#F87171" }]}>Discount</Text>
              <Text style={[detailStyles.financialValue, { color: "#F87171" }]}>-{formatCurrency(est.discountAmount)}</Text>
            </View>
          )}
          {est.taxAmount && parseFloat(est.taxAmount) > 0 && (
            <View style={detailStyles.financialRow}>
              <Text style={detailStyles.financialLabel}>Tax ({est.taxRate}%)</Text>
              <Text style={detailStyles.financialValue}>{formatCurrency(est.taxAmount)}</Text>
            </View>
          )}
          <View style={detailStyles.divider} />
          <View style={detailStyles.financialRow}>
            <Text style={detailStyles.proposalLabel}>Proposal Value</Text>
            <Text style={detailStyles.proposalValue}>{formatCurrency(est.proposalValue)}</Text>
          </View>
        </View>

        {/* Materials */}
        {detail.materials && detail.materials.length > 0 && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Materials ({detail.materials.length})</Text>
            {detail.materials.map((mat, idx) => (
              <View key={mat.id || idx} style={detailStyles.lineItem}>
                <View style={detailStyles.lineItemLeft}>
                  <Text style={detailStyles.lineItemName}>{mat.materialName || `Material #${idx + 1}`}</Text>
                  <Text style={detailStyles.lineItemDetail}>
                    {mat.quantity} {mat.unit || "units"} × {formatCurrency(mat.unitCost)}
                  </Text>
                </View>
                <Text style={detailStyles.lineItemTotal}>{formatCurrency(mat.totalCost)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Labor */}
        {detail.labor && detail.labor.length > 0 && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Labor ({detail.labor.length})</Text>
            {detail.labor.map((lab, idx) => (
              <View key={lab.id || idx} style={detailStyles.lineItem}>
                <View style={detailStyles.lineItemLeft}>
                  <Text style={detailStyles.lineItemName}>{lab.roleName || `Role #${idx + 1}`}</Text>
                  <Text style={detailStyles.lineItemDetail}>
                    {lab.workers} worker{(lab.workers || 0) > 1 ? "s" : ""} × {lab.days} day{(lab.days || 0) > 1 ? "s" : ""} × {formatCurrency(lab.ratePerDay)}/day
                  </Text>
                </View>
                <Text style={detailStyles.lineItemTotal}>{formatCurrency(lab.totalCost)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Other Costs */}
        {detail.otherCosts && detail.otherCosts.length > 0 && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Other Costs ({detail.otherCosts.length})</Text>
            {detail.otherCosts.map((cost, idx) => (
              <View key={cost.id || idx} style={detailStyles.lineItem}>
                <View style={detailStyles.lineItemLeft}>
                  <Text style={detailStyles.lineItemName}>{cost.description || `Cost #${idx + 1}`}</Text>
                  {cost.category && <Text style={detailStyles.lineItemDetail}>{cost.category}</Text>}
                </View>
                <Text style={detailStyles.lineItemTotal}>{formatCurrency(cost.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Scope of Work */}
        {est.scopeOfWork && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Scope of Work</Text>
            <Text style={detailStyles.scopeText}>{est.scopeOfWork}</Text>
          </View>
        )}

        {/* Notes */}
        {est.notes && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.sectionTitle}>Notes</Text>
            <Text style={detailStyles.scopeText}>{est.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES — LIST
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    margin: 16,
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#1A2A40",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: { color: "#5A6A80", fontSize: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  estimateNumber: { color: "#E2E8F0", fontSize: 15, fontWeight: "700" },
  estimateTitle: { color: "#8892A4", fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  cardBody: { marginBottom: 10, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { color: "#8892A4", fontSize: 12, flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1A2A40",
    paddingTop: 10,
  },
  totalItem: { flex: 1 },
  totalLabel: { color: "#5A6A80", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  totalValue: { color: "#E2E8F0", fontSize: 14, fontWeight: "600", marginTop: 2 },
  proposalValue: { color: "#34D399", fontSize: 14, fontWeight: "700", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#5A6A80", fontSize: 14 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 22, 40, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ============================================================================
// STYLES — DETAIL
// ============================================================================

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1D32",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  estimateNumber: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  title: { color: "#8892A4", fontSize: 14, marginTop: 6 },
  type: { color: "#5A6A80", fontSize: 12, marginTop: 4 },
  sectionTitle: { color: "#93C5FD", fontSize: 13, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  projectName: { color: "#E2E8F0", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  infoText: { color: "#8892A4", fontSize: 13, marginBottom: 2 },
  dateRow: { flexDirection: "row", gap: 24 },
  dateItem: { flex: 1 },
  dateLabel: { color: "#5A6A80", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  dateValue: { color: "#E2E8F0", fontSize: 14, fontWeight: "500", marginTop: 4 },
  financialRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  financialLabel: { color: "#8892A4", fontSize: 13 },
  financialValue: { color: "#E2E8F0", fontSize: 13, fontWeight: "500" },
  financialValueBold: { color: "#E2E8F0", fontSize: 14, fontWeight: "700" },
  proposalLabel: { color: "#34D399", fontSize: 14, fontWeight: "600" },
  proposalValue: { color: "#34D399", fontSize: 16, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#1A2A40", marginVertical: 6 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A2A40" },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemName: { color: "#E2E8F0", fontSize: 13, fontWeight: "500" },
  lineItemDetail: { color: "#5A6A80", fontSize: 11, marginTop: 2 },
  lineItemTotal: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  scopeText: { color: "#8892A4", fontSize: 13, lineHeight: 20 },
});
