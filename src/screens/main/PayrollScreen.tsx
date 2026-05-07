import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

// =============================================================================
// TYPES
// =============================================================================
interface PayrollEmployee {
  id: number;
  name: string;
  email: string;
  payType: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  daysWorked: number;
}

interface PayrollSummary {
  totalHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalRegularPay: number;
  totalOvertimePay: number;
  totalPay: number;
}

interface PayrollReport {
  employees: PayrollEmployee[];
  projects: { id: number; name: string; totalHours: number; totalPay: number }[];
  summary: PayrollSummary;
  overtimeEnabled: boolean;
}

interface LastPaidWeek {
  id: number;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  status: string;
  totalPay: string;
  paidAt: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Get current FLSA payroll week (Sunday to Saturday) */
function getCurrentPayrollWeek(): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return { start: sunday, end: saturday };
}

/** Format date as "MMM DD" */
function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Format date as "YYYY-MM-DD" */
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format currency */
function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value).toLocaleString()}`;
  return `$${value.toFixed(2)}`;
}

/** Format hours */
function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// =============================================================================
// DATE PICKER COMPONENT (Week-based navigation)
// =============================================================================
interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  isCurrentWeek: boolean;
}

function DateRangePicker({ startDate, endDate, onPrevWeek, onNextWeek, onCurrentWeek, isCurrentWeek }: DateRangePickerProps) {
  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity style={styles.dateNavButton} onPress={onPrevWeek}>
        <Ionicons name="chevron-back" size={20} color="#3B82F6" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.dateRangeDisplay} onPress={onCurrentWeek}>
        <Ionicons name="calendar-outline" size={16} color="#8892A4" style={{ marginRight: 6 }} />
        <Text style={styles.dateRangeText}>
          {formatShortDate(startDate)} – {formatShortDate(endDate)}
        </Text>
        {!isCurrentWeek && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.dateNavButton, isCurrentWeek && styles.dateNavButtonDisabled]}
        onPress={onNextWeek}
        disabled={isCurrentWeek}
      >
        <Ionicons name="chevron-forward" size={20} color={isCurrentWeek ? "#3A4A5C" : "#3B82F6"} />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function PayrollScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [lastPaidWeek, setLastPaidWeek] = useState<LastPaidWeek | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Date range state - defaults to current open week
  const [startDate, setStartDate] = useState<Date>(() => getCurrentPayrollWeek().start);
  const [endDate, setEndDate] = useState<Date>(() => getCurrentPayrollWeek().end);

  // Expanded employees
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Determine if showing current week
  const isCurrentWeek = useMemo(() => {
    const cw = getCurrentPayrollWeek();
    return formatDateISO(startDate) === formatDateISO(cw.start);
  }, [startDate]);

  // Fetch last paid week to determine open period
  const fetchLastPaidWeek = useCallback(async () => {
    try {
      const data = await apiClient.get<LastPaidWeek>("time.getLastPaidWeek");
      setLastPaidWeek(data);
      if (data) {
        // Open period starts day after last paid week end
        const lastEnd = new Date(data.weekEnd);
        const openStart = new Date(lastEnd);
        openStart.setDate(openStart.getDate() + 1);
        openStart.setHours(0, 0, 0, 0);
        // End is Saturday of current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (6 - dayOfWeek));
        saturday.setHours(23, 59, 59, 999);
        setStartDate(openStart);
        setEndDate(saturday);
      }
    } catch {
      // If no last paid week, use current FLSA week
      const cw = getCurrentPayrollWeek();
      setStartDate(cw.start);
      setEndDate(cw.end);
    } finally {
      setInitialLoad(false);
    }
  }, []);

  // Fetch payroll report
  const fetchReport = useCallback(async () => {
    if (initialLoad) return; // Wait for date initialization
    try {
      setError(null);
      const data = await apiClient.get<PayrollReport>("time.getPayrollReport", {
        startDate: startDate,
        endDate: endDate,
      });
      if (data) {
        setReport(data);
      } else {
        setReport(null);
        setError("Failed to load payroll data");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, initialLoad]);

  // Initial load - get last paid week first
  useEffect(() => {
    fetchLastPaidWeek();
  }, []);

  // Fetch report when dates change (after initial load)
  useEffect(() => {
    if (!initialLoad) {
      setLoading(true);
      fetchReport();
    }
  }, [startDate, endDate, initialLoad]);

  // Navigation
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
    if (lastPaidWeek) {
      const lastEnd = new Date(lastPaidWeek.weekEnd);
      const openStart = new Date(lastEnd);
      openStart.setDate(openStart.getDate() + 1);
      openStart.setHours(0, 0, 0, 0);
      const today = new Date();
      const dayOfWeek = today.getDay();
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + (6 - dayOfWeek));
      saturday.setHours(23, 59, 59, 999);
      setStartDate(openStart);
      setEndDate(saturday);
    } else {
      const cw = getCurrentPayrollWeek();
      setStartDate(cw.start);
      setEndDate(cw.end);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if ((loading || initialLoad) && !report) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading payroll...</Text>
      </View>
    );
  }

  if (error && !report) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const employees = report?.employees || [];
  const summary = report?.summary || { totalHours: 0, totalRegularHours: 0, totalOvertimeHours: 0, totalRegularPay: 0, totalOvertimePay: 0, totalPay: 0 };

  // Sort employees by totalPay descending
  const sortedEmployees = [...employees].sort((a, b) => b.totalPay - a.totalPay);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
      }
    >
      {/* Date Range Picker */}
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onCurrentWeek={goToCurrentWeek}
        isCurrentWeek={isCurrentWeek}
      />

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Pay</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalPay)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Hours</Text>
          <Text style={styles.summaryValue}>{formatHours(summary.totalHours)}</Text>
        </View>
      </View>

      {summary.totalOvertimeHours > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>Regular</Text>
            <Text style={styles.summaryValueSmall}>{formatHours(summary.totalRegularHours)}</Text>
          </View>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>Overtime</Text>
            <Text style={[styles.summaryValueSmall, { color: "#F59E0B" }]}>{formatHours(summary.totalOvertimeHours)}</Text>
          </View>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>OT Pay</Text>
            <Text style={[styles.summaryValueSmall, { color: "#F59E0B" }]}>{formatCurrency(summary.totalOvertimePay)}</Text>
          </View>
        </View>
      )}

      {/* Employee Count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Employees ({sortedEmployees.length})
        </Text>
        {loading && <ActivityIndicator size="small" color="#3B82F6" />}
      </View>

      {/* Employee List */}
      {sortedEmployees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyText}>No payroll entries for this period</Text>
        </View>
      ) : (
        sortedEmployees.map((emp) => (
          <TouchableOpacity
            key={emp.id}
            style={styles.employeeCard}
            onPress={() => toggleExpanded(emp.id)}
            activeOpacity={0.7}
          >
            <View style={styles.employeeHeader}>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName} numberOfLines={1}>{emp.name}</Text>
                <Text style={styles.employeeMeta}>
                  {emp.payType === "hourly" ? "Hourly" : emp.payType === "daily" ? "Daily" : emp.payType === "weekly" ? "Weekly" : emp.payType}
                  {" · "}{emp.daysWorked} day{emp.daysWorked !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.employeePayInfo}>
                <Text style={styles.employeePay}>{formatCurrency(emp.totalPay)}</Text>
                <Text style={styles.employeeHours}>{formatHours(emp.totalHours)}</Text>
              </View>
              <Ionicons
                name={expandedIds.has(emp.id) ? "chevron-up" : "chevron-down"}
                size={18}
                color="#5A6A80"
                style={{ marginLeft: 8 }}
              />
            </View>

            {expandedIds.has(emp.id) && (
              <View style={styles.employeeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Regular Hours</Text>
                  <Text style={styles.detailValue}>{formatHours(emp.regularHours)}</Text>
                </View>
                {emp.overtimeHours > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Overtime Hours</Text>
                    <Text style={[styles.detailValue, { color: "#F59E0B" }]}>{formatHours(emp.overtimeHours)}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Regular Pay</Text>
                  <Text style={styles.detailValue}>{formatCurrency(emp.regularPay)}</Text>
                </View>
                {emp.overtimePay > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Overtime Pay</Text>
                    <Text style={[styles.detailValue, { color: "#F59E0B" }]}>{formatCurrency(emp.overtimePay)}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1628",
    padding: 24,
  },
  loadingText: {
    color: "#8892A4",
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#1E3A5F",
    borderRadius: 8,
  },
  retryText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },

  // Date Picker
  datePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  dateNavButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A2A40",
  },
  dateNavButtonDisabled: {
    opacity: 0.4,
  },
  dateRangeDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  dateRangeText: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  todayBadge: {
    marginLeft: 8,
    backgroundColor: "#1E3A5F",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "600",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  summaryLabel: {
    color: "#8892A4",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    color: "#E2E8F0",
    fontSize: 22,
    fontWeight: "700",
  },
  summaryCardSmall: {
    flex: 1,
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  summaryLabelSmall: {
    color: "#8892A4",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  summaryValueSmall: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#8892A4",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },

  // Employee Card
  employeeCard: {
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  employeeMeta: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },
  employeePayInfo: {
    alignItems: "flex-end",
  },
  employeePay: {
    color: "#10B981",
    fontSize: 15,
    fontWeight: "700",
  },
  employeeHours: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 1,
  },

  // Expanded Details
  employeeDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A2A40",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    color: "#8892A4",
    fontSize: 13,
  },
  detailValue: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
});
