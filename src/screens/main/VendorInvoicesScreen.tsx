import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface VendorInvoice {
  invoice: {
    id: number;
    vendorId: number;
    invoiceNumber: string;
    invoiceDate: string | null;
    dueDate: string | null;
    totalAmount: string;
    status: string;
    notes: string | null;
  };
  vendorName: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#78350F", text: "#FCD34D" },
  matched: { bg: "#1E3A5F", text: "#60A5FA" },
  disputed: { bg: "#7F1D1D", text: "#FCA5A5" },
  approved: { bg: "#064E3B", text: "#6EE7B7" },
  paid: { bg: "#1E293B", text: "#94A3B8" },
  cancelled: { bg: "#1E293B", text: "#64748B" },
};

const STATUS_FILTERS = ["all", "pending", "matched", "disputed", "approved", "paid"];

export default function VendorInvoicesScreen() {
  const { t } = useLanguageStore();
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const res = await apiClient.query<VendorInvoice[]>("vendorInvoices.list", params);
      if (res.ok && res.data) {
        setInvoices(Array.isArray(res.data) ? res.data : []);
      } else {
        setInvoices([]);
        if (res.error) setError(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const totalAmount = useMemo(() => {
    return invoices.reduce((s, inv) => s + parseFloat(inv.invoice.totalAmount || "0"), 0);
  }, [invoices]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };

  const renderInvoice = ({ item }: { item: VendorInvoice }) => {
    const inv = item.invoice;
    const statusColor = STATUS_COLORS[inv.status] || STATUS_COLORS.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNumber}>#{inv.invoiceNumber}</Text>
            {item.vendorName && (
              <Text style={styles.vendorName}>{item.vendorName}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t("vendorInvoices.invoiceDate") || "Date"}</Text>
              <Text style={styles.detailValue}>{formatDate(inv.invoiceDate)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t("billing.dueDate") || "Due"}</Text>
              <Text style={styles.detailValue}>{formatDate(inv.dueDate)}</Text>
            </View>
            <View style={[styles.detailItem, { alignItems: "flex-end" }]}>
              <Text style={styles.detailLabel}>{t("common.totalLabel") || "Total"}</Text>
              <Text style={styles.amountValue}>${parseFloat(inv.totalAmount || "0").toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>{t("common.loading") || "Loading..."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item: status }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(status)}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status === "all" ? (t("common.all") || "All") : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{invoices.length}</Text>
          <Text style={styles.summaryLabel}>{t("vendorInvoices.vendorInvoice") || "Invoices"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>${totalAmount.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("common.totalLabel") || "Total"}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {invoices.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("vendorInvoices.noInvoices") || "No vendor invoices found"}</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.invoice.id.toString()}
          renderItem={renderInvoice}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#3B82F6"
              colors={["#3B82F6"]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#0A1628", padding: 24,
  },
  loadingText: { color: "#8892A4", fontSize: 14, marginTop: 12 },
  filterRow: { paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40",
  },
  filterChipActive: { backgroundColor: "#1E3A5F", borderColor: "#3B82F6" },
  filterChipText: { color: "#8892A4", fontSize: 13 },
  filterChipTextActive: { color: "#60A5FA", fontWeight: "600" },
  summaryRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 10,
  },
  summaryCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  summaryNumber: { color: "#E2E8F0", fontSize: 20, fontWeight: "700" },
  summaryLabel: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10,
    backgroundColor: "#7F1D1D", borderRadius: 8,
  },
  errorBannerText: { color: "#FCA5A5", fontSize: 13, flex: 1 },
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 24,
  },
  emptyText: { color: "#8892A4", fontSize: 14, marginTop: 12, textAlign: "center" },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: "#1A2A40", overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  invoiceNumber: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  vendorName: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardBody: { padding: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailItem: {},
  detailLabel: { color: "#8892A4", fontSize: 10, marginBottom: 2 },
  detailValue: { color: "#CBD5E1", fontSize: 13 },
  amountValue: { color: "#6EE7B7", fontSize: 16, fontWeight: "700" },
});
