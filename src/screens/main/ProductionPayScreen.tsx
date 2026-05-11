import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

// =============================================================================
// TYPES
// =============================================================================
interface ProductionEntry {
  id: number;
  tenantId: number;
  employeeId: number;
  projectId: number | null;
  productionTypeId: number | null;
  date: string;
  quantity: string;
  unitType: string;
  ratePerUnit: string;
  totalProductionPay: string;
  guaranteedPay: string;
  appliedPay: string;
  payBasis: string;
  notes: string | null;
  employeeName: string | null;
  projectName: string | null;
}

interface EmployeeGroup {
  employeeId: number;
  employeeName: string;
  entries: ProductionEntry[];
  totalProductionPay: number;
  totalGuaranteePay: number;
  totalAppliedPay: number;
  productionDays: number;
  guaranteeDays: number;
  totalQuantity: number;
}

// =============================================================================
// HELPERS
// =============================================================================
function getCurrentWeek(): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return { start: sunday, end: saturday };
}

function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatCurrency(value: number): string {
  if (value === 0) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function formatEntryDate(dateStr: string): string {
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return localDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatQuantity(qty: string, unitType: string): string {
  const num = parseFloat(qty);
  const unitLabels: Record<string, string> = {
    sqf: "sq ft", board_ft: "board ft", linear_ft: "linear ft",
    unit: "units", each: "each", lbs: "lbs", gallons: "gal", hours: "hrs",
  };
  const label = unitLabels[unitType] || unitType;
  return `${num.toLocaleString()} ${label}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function ProductionPayScreen() {
  const { t } = useLanguageStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [startDate, setStartDate] = useState<Date>(() => getCurrentWeek().start);
  const [endDate, setEndDate] = useState<Date>(() => getCurrentWeek().end);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const isCurrentWeek = useMemo(() => {
    const cw = getCurrentWeek();
    return formatDateISO(startDate) === formatDateISO(cw.start);
  }, [startDate]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.get<ProductionEntry[]>("productionEntries.listByTenant", {
        startDate: formatDateISO(startDate),
        endDate: formatDateISO(endDate),
      });
      setEntries(data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load production data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [startDate, endDate]);

  const goToPrevWeek = () => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - 7);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() - 7);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const goToNextWeek = () => {
    if (isCurrentWeek) return;
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + 7);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + 7);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const goToCurrentWeek = () => {
    const cw = getCurrentWeek();
    setStartDate(cw.start);
    setEndDate(cw.end);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const employeeGroups = useMemo((): EmployeeGroup[] => {
    const groupMap = new Map<number, EmployeeGroup>();
    for (const entry of entries) {
      if (!groupMap.has(entry.employeeId)) {
        groupMap.set(entry.employeeId, {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName || "Unknown",
          entries: [],
          totalProductionPay: 0, totalGuaranteePay: 0, totalAppliedPay: 0,
          productionDays: 0, guaranteeDays: 0, totalQuantity: 0,
        });
      }
      const group = groupMap.get(entry.employeeId)!;
      group.entries.push(entry);
      group.totalProductionPay += parseFloat(entry.totalProductionPay || "0");
      group.totalGuaranteePay += parseFloat(entry.guaranteedPay || "0");
      group.totalAppliedPay += parseFloat(entry.appliedPay || "0");
      group.totalQuantity += parseFloat(entry.quantity || "0");
      if (entry.payBasis === "production") group.productionDays++; else group.guaranteeDays++;
    }
    let groups = Array.from(groupMap.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      groups = groups.filter((g) => g.employeeName.toLowerCase().includes(q));
    }
    return groups.sort((a, b) => b.totalAppliedPay - a.totalAppliedPay);
  }, [entries, searchQuery]);

  const summary = useMemo(() => {
    return employeeGroups.reduce(
      (acc, g) => ({
        totalAppliedPay: acc.totalAppliedPay + g.totalAppliedPay,
        totalProductionPay: acc.totalProductionPay + g.totalProductionPay,
        totalGuaranteePay: acc.totalGuaranteePay + g.totalGuaranteePay,
        totalEntries: acc.totalEntries + g.entries.length,
        totalEmployees: acc.totalEmployees + 1,
      }),
      { totalAppliedPay: 0, totalProductionPay: 0, totalGuaranteePay: 0, totalEntries: 0, totalEmployees: 0 }
    );
  }, [employeeGroups]);

  if (loading && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading production data...</Text>
      </View>
    );
  }

  if (error && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Date Range Picker */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity style={styles.dateNavButton} onPress={goToPrevWeek}>
          <Ionicons name="chevron-back" size={20} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateRangeDisplay} onPress={goToCurrentWeek}>
          <Ionicons name="calendar-outline" size={16} color="#8892A4" style={{ marginRight: 6 }} />
          <Text style={styles.dateRangeText}>
            {formatShortDate(startDate)} – {formatShortDate(endDate)}
          </Text>
          {!isCurrentWeek && (
            <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateNavButton, isCurrentWeek && styles.dateNavButtonDisabled]}
          onPress={goToNextWeek}
          disabled={isCurrentWeek}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentWeek ? "#3A4A5C" : "#3B82F6"} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Pay</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalAppliedPay)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Employees</Text>
          <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCardSmall}>
          <Text style={styles.summaryLabelSmall}>Production Pay</Text>
          <Text style={[styles.summaryValueSmall, { color: "#10B981" }]}>{formatCurrency(summary.totalProductionPay)}</Text>
        </View>
        <View style={styles.summaryCardSmall}>
          <Text style={styles.summaryLabelSmall}>Guarantee Pay</Text>
          <Text style={[styles.summaryValueSmall, { color: "#F59E0B" }]}>{formatCurrency(summary.totalGuaranteePay)}</Text>
        </View>
        <View style={styles.summaryCardSmall}>
          <Text style={styles.summaryLabelSmall}>Entries</Text>
          <Text style={styles.summaryValueSmall}>{summary.totalEntries}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color="#5A6A80" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employee..."
          placeholderTextColor="#5A6A80"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color="#5A6A80" />
          </TouchableOpacity>
        )}
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Employees ({employeeGroups.length})</Text>
        {loading && <ActivityIndicator size="small" color="#3B82F6" />}
      </View>

      {/* Employee Groups */}
      {employeeGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="construct-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No employees match your search" : "No production entries for this period"}
          </Text>
        </View>
      ) : (
        employeeGroups.map((group) => {
          const isExpanded = expandedIds.has(group.employeeId);
          return (
            <View key={group.employeeId} style={styles.employeeCard}>
              <TouchableOpacity
                style={styles.employeeHeader}
                onPress={() => toggleExpanded(group.employeeId)}
                activeOpacity={0.7}
              >
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName} numberOfLines={1}>{group.employeeName}</Text>
                  <Text style={styles.employeeMeta}>
                    {group.entries.length} entr{group.entries.length !== 1 ? "ies" : "y"}
                    {group.productionDays > 0 && ` · ${group.productionDays} prod`}
                    {group.guaranteeDays > 0 && ` · ${group.guaranteeDays} guar`}
                  </Text>
                </View>
                <View style={styles.employeePayInfo}>
                  <Text style={styles.employeePay}>{formatCurrency(group.totalAppliedPay)}</Text>
                  <View style={styles.payBasisBadge}>
                    <Text style={styles.payBasisText}>
                      {group.productionDays > group.guaranteeDays ? "Production" : "Guarantee"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18} color="#5A6A80" style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.employeeDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Production Pay</Text>
                    <Text style={[styles.detailValue, { color: "#10B981" }]}>{formatCurrency(group.totalProductionPay)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Guarantee Pay</Text>
                    <Text style={[styles.detailValue, { color: "#F59E0B" }]}>{formatCurrency(group.totalGuaranteePay)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Applied Pay</Text>
                    <Text style={styles.detailValue}>{formatCurrency(group.totalAppliedPay)}</Text>
                  </View>

                  <View style={styles.entriesSection}>
                    <Text style={styles.entriesSectionTitle}>Daily Entries</Text>
                    {group.entries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry) => (
                        <View key={entry.id} style={styles.entryRow}>
                          <View style={styles.entryInfo}>
                            <Text style={styles.entryDate}>{formatEntryDate(entry.date)}</Text>
                            {entry.projectName && (
                              <Text style={styles.entryProject} numberOfLines={1}>{entry.projectName}</Text>
                            )}
                            <Text style={styles.entryQuantity}>
                              {formatQuantity(entry.quantity, entry.unitType)} @ ${parseFloat(entry.ratePerUnit).toFixed(4)}/{entry.unitType}
                            </Text>
                          </View>
                          <View style={styles.entryRight}>
                            <Text style={styles.entryPay}>{formatCurrency(parseFloat(entry.appliedPay))}</Text>
                            <View style={[
                              styles.basisBadge,
                              entry.payBasis === "production" ? styles.basisProduction : styles.basisGuarantee,
                            ]}>
                              <Text style={[
                                styles.basisBadgeText,
                                entry.payBasis === "production" ? styles.basisProductionText : styles.basisGuaranteeText,
                              ]}>
                                {entry.payBasis === "production" ? "Prod" : "Guar"}
                              </Text>
                            </View>
                            {entry.notes && (
                              <Ionicons name="chatbubble-outline" size={12} color="#5A6A80" style={{ marginTop: 2 }} />
                            )}
                          </View>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628", padding: 24 },
  loadingText: { color: "#8892A4", fontSize: 14, marginTop: 12 },
  errorText: { color: "#EF4444", fontSize: 14, marginTop: 12, textAlign: "center" },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: "#1E3A5F", borderRadius: 8 },
  retryText: { color: "#3B82F6", fontSize: 14, fontWeight: "600" },
  datePickerContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 8, borderWidth: 1, borderColor: "#1A2A40" },
  dateNavButton: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: "#1A2A40" },
  dateNavButtonDisabled: { opacity: 0.4 },
  dateRangeDisplay: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  dateRangeText: { color: "#E2E8F0", fontSize: 15, fontWeight: "600" },
  todayBadge: { marginLeft: 8, backgroundColor: "#1E3A5F", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { color: "#3B82F6", fontSize: 11, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  summaryLabel: { color: "#8892A4", fontSize: 12, fontWeight: "500", marginBottom: 4 },
  summaryValue: { color: "#E2E8F0", fontSize: 22, fontWeight: "700" },
  summaryCardSmall: { flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1A2A40" },
  summaryLabelSmall: { color: "#8892A4", fontSize: 11, fontWeight: "500", marginBottom: 2 },
  summaryValueSmall: { color: "#E2E8F0", fontSize: 15, fontWeight: "700" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#1A2A40", marginBottom: 12 },
  searchInput: { flex: 1, color: "#E2E8F0", fontSize: 14, marginLeft: 8, padding: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: "#8892A4", fontSize: 14, marginTop: 12, textAlign: "center" },
  employeeCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1A2A40" },
  employeeHeader: { flexDirection: "row", alignItems: "center" },
  employeeInfo: { flex: 1 },
  employeeName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  employeeMeta: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  employeePayInfo: { alignItems: "flex-end" },
  employeePay: { color: "#10B981", fontSize: 15, fontWeight: "700" },
  payBasisBadge: { backgroundColor: "#1A2A40", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  payBasisText: { color: "#8892A4", fontSize: 10, fontWeight: "600" },
  employeeDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A2A40" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  detailLabel: { color: "#8892A4", fontSize: 13 },
  detailValue: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  entriesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A2A40" },
  entriesSectionTitle: { color: "#8892A4", fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  entryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0A1628" },
  entryInfo: { flex: 1 },
  entryDate: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  entryProject: { color: "#5A6A80", fontSize: 11, marginTop: 1 },
  entryQuantity: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  entryRight: { alignItems: "flex-end", gap: 4 },
  entryPay: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  basisBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  basisProduction: { backgroundColor: "#064E3B" },
  basisGuarantee: { backgroundColor: "#451A03" },
  basisBadgeText: { fontSize: 10, fontWeight: "600" },
  basisProductionText: { color: "#10B981" },
  basisGuaranteeText: { color: "#F59E0B" },
});
