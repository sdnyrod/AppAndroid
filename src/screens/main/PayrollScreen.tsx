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
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

// =============================================================================
// TYPES
// =============================================================================
interface TimeEntry {
  id: number;
  clockIn: string;
  clockOut: string | null;
  totalHours: string | null;
  projectId: number | null;
  projectName: string;
  notes: string | null;
  breakMinutes: number | null;
  clockInMethod: string | null;
  clockOutMethod: string | null;
  isEdited: boolean | null;
  isManualEntry: boolean | null;
  classificationId: number | null;
  classificationName: string | null;
  appliedHourlyRate: string | null;
  effectivePayRate: number;
  effectiveHourlyRate: number;
  isSuspicious: boolean;
}

interface PayrollEmployee {
  id: number;
  name: string;
  email: string;
  payType: string;
  hourlyRate: number;
  payRate: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  daysWorked: number;
  entries: TimeEntry[];
  classificationBreakdown?: {
    classificationId: number | null;
    classificationName: string;
    hours: number;
    hourlyRate: number;
    subtotal: number;
    daysWorked?: number;
  }[];
  productionSummary?: {
    totalProductionPay: number;
    totalAppliedPay: number;
    productionDays: number;
    productionBonus: number;
  };
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

function getCurrentPayrollWeek(): { start: Date; end: Date } {
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

function formatShortDate(date: Date, t: (key: string) => string): string {
  const months = [t("months.jan"), t("months.feb"), t("months.mar"), t("months.apr"), t("months.may"), t("months.jun"), t("months.jul"), t("months.aug"), t("months.sep"), t("months.oct"), t("months.nov"), t("months.dec")];
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
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `$${Math.round(value).toLocaleString()}`;
  return `$${value.toFixed(2)}`;
}

function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// =============================================================================
// DATE RANGE PICKER
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
  const { t } = useLanguageStore();
  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity style={styles.dateNavButton} onPress={onPrevWeek}>
        <Ionicons name="chevron-back" size={20} color="#3B82F6" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.dateRangeDisplay} onPress={onCurrentWeek}>
        <Ionicons name="calendar-outline" size={16} color="#8892A4" style={{ marginRight: 6 }} />
        <Text style={styles.dateRangeText}>
          {formatShortDate(startDate, t)} – {formatShortDate(endDate, t)}
        </Text>
        {!isCurrentWeek && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{t("common.today")}</Text>
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
// EDIT TIME ENTRY MODAL
// =============================================================================
interface EditEntryModalProps {
  visible: boolean;
  entry: TimeEntry | null;
  onClose: () => void;
  onSave: (entryId: number, data: { clockIn?: Date; clockOut?: Date; breakMinutes?: number; notes?: string }) => void;
  saving: boolean;
}

function EditEntryModal({ visible, entry, onClose, onSave, saving }: EditEntryModalProps) {
  const [clockIn, setClockIn] = useState<Date>(new Date());
  const [clockOut, setClockOut] = useState<Date>(new Date());
  const [breakMins, setBreakMins] = useState("0");
  const [notes, setNotes] = useState("");
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);
  const [showClockInDatePicker, setShowClockInDatePicker] = useState(false);
  const [showClockOutDatePicker, setShowClockOutDatePicker] = useState(false);

  useEffect(() => {
    if (entry) {
      setClockIn(new Date(entry.clockIn));
      setClockOut(entry.clockOut ? new Date(entry.clockOut) : new Date());
      setBreakMins(String(entry.breakMinutes || 0));
      setNotes(entry.notes || "");
    }
  }, [entry]);

  if (!entry) return null;

  const handleSave = () => {
    onSave(entry.id, {
      clockIn,
      clockOut,
      breakMinutes: parseInt(breakMins) || 0,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Time Entry</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#8892A4" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>{entry.projectName}</Text>

          {/* Clock In Date */}
          <Text style={styles.fieldLabel}>Clock In Date</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowClockInDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
            <Text style={styles.timeButtonText}>{formatDate(clockIn.toISOString())}</Text>
          </TouchableOpacity>
          {showClockInDatePicker && (
            <DateTimePicker
              value={clockIn}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowClockInDatePicker(false);
                if (date) {
                  const newDate = new Date(clockIn);
                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setClockIn(newDate);
                }
              }}
              themeVariant="dark"
            />
          )}

          {/* Clock In Time */}
          <Text style={styles.fieldLabel}>Clock In Time</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowClockInPicker(true)}>
            <Ionicons name="time-outline" size={18} color="#3B82F6" />
            <Text style={styles.timeButtonText}>{formatTime(clockIn.toISOString())}</Text>
          </TouchableOpacity>
          {showClockInPicker && (
            <DateTimePicker
              value={clockIn}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowClockInPicker(false);
                if (date) setClockIn(date);
              }}
              themeVariant="dark"
            />
          )}

          {/* Clock Out Date */}
          <Text style={styles.fieldLabel}>Clock Out Date</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowClockOutDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
            <Text style={styles.timeButtonText}>{formatDate(clockOut.toISOString())}</Text>
          </TouchableOpacity>
          {showClockOutDatePicker && (
            <DateTimePicker
              value={clockOut}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowClockOutDatePicker(false);
                if (date) {
                  const newDate = new Date(clockOut);
                  newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setClockOut(newDate);
                }
              }}
              themeVariant="dark"
            />
          )}

          {/* Clock Out Time */}
          <Text style={styles.fieldLabel}>Clock Out Time</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowClockOutPicker(true)}>
            <Ionicons name="time-outline" size={18} color="#3B82F6" />
            <Text style={styles.timeButtonText}>{formatTime(clockOut.toISOString())}</Text>
          </TouchableOpacity>
          {showClockOutPicker && (
            <DateTimePicker
              value={clockOut}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowClockOutPicker(false);
                if (date) setClockOut(date);
              }}
              themeVariant="dark"
            />
          )}

          {/* Break Minutes */}
          <Text style={styles.fieldLabel}>Break (minutes)</Text>
          <TextInput
            style={styles.textInput}
            value={breakMins}
            onChangeText={setBreakMins}
            keyboardType="numeric"
            placeholderTextColor="#5A6A80"
          />

          {/* Notes */}
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, { height: 60, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor="#5A6A80"
            placeholder="Optional notes..."
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function PayrollScreen() {
  const { t } = useLanguageStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PayrollReport | null>(null);
  const [lastPaidWeek, setLastPaidWeek] = useState<LastPaidWeek | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Date range state
  const [startDate, setStartDate] = useState<Date>(() => getCurrentPayrollWeek().start);
  const [endDate, setEndDate] = useState<Date>(() => getCurrentPayrollWeek().end);

  // Expanded employees
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Employee filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayType, setFilterPayType] = useState<string | null>(null);

  // Edit modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCurrentWeek = useMemo(() => {
    const cw = getCurrentPayrollWeek();
    return formatDateISO(startDate) === formatDateISO(cw.start);
  }, [startDate]);

  // Fetch last paid week
  const fetchLastPaidWeek = useCallback(async () => {
    try {
      const data = await apiClient.get<LastPaidWeek>("time.getLastPaidWeek");
      setLastPaidWeek(data);
      if (data) {
        const lastEnd = new Date(data.weekEnd);
        // Current payroll starts the day after the last paid week ended
        const nextDay = new Date(lastEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        const today = new Date();
        const dayOfWeek = today.getDay();
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (6 - dayOfWeek));
        saturday.setHours(23, 59, 59, 999);
        setStartDate(nextDay);
        setEndDate(saturday);
      }
    } catch {
      const cw = getCurrentPayrollWeek();
      setStartDate(cw.start);
      setEndDate(cw.end);
    } finally {
      setInitialLoad(false);
    }
  }, []);

  // Fetch payroll report
  const fetchReport = useCallback(async () => {
    if (initialLoad) return;
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
        setError(t("payroll.failedLoad"));
      }
    } catch (e: any) {
      setError(e?.message || t("payroll.failedLoad"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, initialLoad]);

  useEffect(() => { fetchLastPaidWeek(); }, []);

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

  // Edit time entry
  const handleEditEntry = (entry: TimeEntry) => {
    setEditEntry(entry);
    setEditModalVisible(true);
  };

  const handleSaveEntry = async (entryId: number, data: { clockIn?: Date; clockOut?: Date; breakMinutes?: number; notes?: string }) => {
    setSaving(true);
    try {
      await apiClient.post("time.updateTimeEntry", {
        timeEntryId: entryId,
        ...data,
      });
      Alert.alert("Success", "Time entry updated successfully");
      setEditModalVisible(false);
      setEditEntry(null);
      // Refresh report
      fetchReport();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update time entry");
    } finally {
      setSaving(false);
    }
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    const employees = report?.employees || [];
    let filtered = [...employees];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q)
      );
    }

    // Pay type filter
    if (filterPayType) {
      filtered = filtered.filter((emp) => emp.payType === filterPayType);
    }

    // Sort by totalPay descending
    return filtered.sort((a, b) => b.totalPay - a.totalPay);
  }, [report, searchQuery, filterPayType]);

  // Get unique pay types for filter
  const payTypes = useMemo(() => {
    const types = new Set<string>();
    (report?.employees || []).forEach((emp) => types.add(emp.payType));
    return Array.from(types);
  }, [report]);

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
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const summary = report?.summary || { totalHours: 0, totalRegularHours: 0, totalOvertimeHours: 0, totalRegularPay: 0, totalOvertimePay: 0, totalPay: 0 };

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
          <Text style={styles.summaryLabel}>{t("payroll.totalPay")}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalPay)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("payroll.totalHours")}</Text>
          <Text style={styles.summaryValue}>{formatHours(summary.totalHours)}</Text>
        </View>
      </View>

      {summary.totalOvertimeHours > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>{t("payroll.regular")}</Text>
            <Text style={styles.summaryValueSmall}>{formatHours(summary.totalRegularHours)}</Text>
          </View>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>{t("payroll.overtime")}</Text>
            <Text style={[styles.summaryValueSmall, { color: "#F59E0B" }]}>{formatHours(summary.totalOvertimeHours)}</Text>
          </View>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summaryLabelSmall}>{t("payroll.otPay")}</Text>
            <Text style={[styles.summaryValueSmall, { color: "#F59E0B" }]}>{formatCurrency(summary.totalOvertimePay)}</Text>
          </View>
        </View>
      )}

      {/* Search & Filter */}
      <View style={styles.filterContainer}>
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
        {payTypes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            <TouchableOpacity
              style={[styles.chip, !filterPayType && styles.chipActive]}
              onPress={() => setFilterPayType(null)}
            >
              <Text style={[styles.chipText, !filterPayType && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {payTypes.map((pt) => (
              <TouchableOpacity
                key={pt}
                style={[styles.chip, filterPayType === pt && styles.chipActive]}
                onPress={() => setFilterPayType(filterPayType === pt ? null : pt)}
              >
                <Text style={[styles.chipText, filterPayType === pt && styles.chipTextActive]}>
                  {pt === "hourly" ? "Hourly" : pt === "daily" ? "Daily" : pt === "weekly" ? "Weekly" : pt === "production" ? "Production" : pt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Employee Count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Employees ({filteredEmployees.length})
        </Text>
        {loading && <ActivityIndicator size="small" color="#3B82F6" />}
      </View>

      {/* Employee List */}
      {filteredEmployees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyText}>
            {searchQuery ? "No employees match your search" : t("payroll.noEntries")}
          </Text>
        </View>
      ) : (
        filteredEmployees.map((emp) => {
          const isExpanded = expandedIds.has(emp.id);
          return (
            <View key={emp.id} style={styles.employeeCard}>
              <TouchableOpacity
                style={styles.employeeHeader}
                onPress={() => toggleExpanded(emp.id)}
                activeOpacity={0.7}
              >
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName} numberOfLines={1}>{emp.name}</Text>
                  <Text style={styles.employeeMeta}>
                    {emp.payType === "hourly" ? "Hourly" : emp.payType === "daily" ? "Daily" : emp.payType === "weekly" ? "Weekly" : emp.payType}
                    {" · "}{emp.daysWorked} day{emp.daysWorked !== 1 ? "s" : ""}
                    {emp.payType === "hourly" && emp.hourlyRate > 0 ? ` · $${emp.hourlyRate}/hr` : ""}
                    {emp.payType === "daily" && emp.payRate > 0 ? ` · $${emp.payRate}/day` : ""}
                  </Text>
                </View>
                <View style={styles.employeePayInfo}>
                  <Text style={styles.employeePay}>{formatCurrency(emp.totalPay)}</Text>
                  <Text style={styles.employeeHours}>{formatHours(emp.totalHours)}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#5A6A80"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.employeeDetails}>
                  {/* Pay Breakdown */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("payroll.regularHours")}</Text>
                    <Text style={styles.detailValue}>{formatHours(emp.regularHours)}</Text>
                  </View>
                  {emp.overtimeHours > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("payroll.overtimeHours")}</Text>
                      <Text style={[styles.detailValue, { color: "#F59E0B" }]}>{formatHours(emp.overtimeHours)}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t("payroll.regularPay")}</Text>
                    <Text style={styles.detailValue}>{formatCurrency(emp.regularPay)}</Text>
                  </View>
                  {emp.overtimePay > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("payroll.overtimePay")}</Text>
                      <Text style={[styles.detailValue, { color: "#F59E0B" }]}>{formatCurrency(emp.overtimePay)}</Text>
                    </View>
                  )}

                  {/* Production Summary */}
                  {emp.productionSummary && emp.productionSummary.productionDays > 0 && (
                    <View style={styles.productionBadge}>
                      <Ionicons name="construct-outline" size={14} color="#8B5CF6" />
                      <Text style={styles.productionText}>
                        Production: {emp.productionSummary.productionDays} days · {formatCurrency(emp.productionSummary.totalAppliedPay)}
                      </Text>
                    </View>
                  )}

                  {/* Time Entries */}
                  {emp.entries && emp.entries.length > 0 && (
                    <View style={styles.entriesSection}>
                      <Text style={styles.entriesSectionTitle}>Time Entries ({emp.entries.length})</Text>
                      {emp.entries
                        .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
                        .map((entry) => (
                          <View key={entry.id} style={styles.entryRow}>
                            <View style={styles.entryInfo}>
                              <Text style={styles.entryDate}>{formatDate(entry.clockIn)}</Text>
                              <Text style={styles.entryTime}>
                                {formatTime(entry.clockIn)} – {entry.clockOut ? formatTime(entry.clockOut) : "Active"}
                              </Text>
                              <Text style={styles.entryProject} numberOfLines={1}>{entry.projectName}</Text>
                              {entry.classificationName && (
                                <Text style={styles.entryClassification}>{entry.classificationName}</Text>
                              )}
                            </View>
                            <View style={styles.entryRight}>
                              <Text style={styles.entryHours}>
                                {entry.totalHours ? formatHours(parseFloat(entry.totalHours)) : "—"}
                              </Text>
                              {entry.isManualEntry && (
                                <View style={styles.manualBadge}>
                                  <Text style={styles.manualBadgeText}>Manual</Text>
                                </View>
                              )}
                              {entry.isEdited && (
                                <View style={[styles.manualBadge, { backgroundColor: "#1E3A5F" }]}>
                                  <Text style={[styles.manualBadgeText, { color: "#3B82F6" }]}>Edited</Text>
                                </View>
                              )}
                              {entry.clockOut && (
                                <TouchableOpacity
                                  style={styles.editEntryButton}
                                  onPress={() => handleEditEntry(entry)}
                                >
                                  <Ionicons name="pencil-outline" size={14} color="#3B82F6" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Projects Summary */}
      {report?.projects && report.projects.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Projects ({report.projects.length})</Text>
          </View>
          {report.projects
            .sort((a, b) => b.totalPay - a.totalPay)
            .map((proj) => (
              <View key={proj.id} style={styles.projectCard}>
                <Text style={styles.projectName} numberOfLines={1}>{proj.name}</Text>
                <View style={styles.projectStats}>
                  <Text style={styles.projectStat}>{formatHours(proj.totalHours)}</Text>
                  <Text style={styles.projectPay}>{formatCurrency(proj.totalPay)}</Text>
                </View>
              </View>
            ))}
        </>
      )}

      {/* Edit Modal */}
      <EditEntryModal
        visible={editModalVisible}
        entry={editEntry}
        onClose={() => { setEditModalVisible(false); setEditEntry(null); }}
        onSave={handleSaveEntry}
        saving={saving}
      />

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

  // Date Picker
  datePickerContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 8, borderWidth: 1, borderColor: "#1A2A40" },
  dateNavButton: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: "#1A2A40" },
  dateNavButtonDisabled: { opacity: 0.4 },
  dateRangeDisplay: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  dateRangeText: { color: "#E2E8F0", fontSize: 15, fontWeight: "600" },
  todayBadge: { marginLeft: 8, backgroundColor: "#1E3A5F", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { color: "#3B82F6", fontSize: 11, fontWeight: "600" },

  // Summary
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  summaryLabel: { color: "#8892A4", fontSize: 12, fontWeight: "500", marginBottom: 4 },
  summaryValue: { color: "#E2E8F0", fontSize: 22, fontWeight: "700" },
  summaryCardSmall: { flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1A2A40" },
  summaryLabelSmall: { color: "#8892A4", fontSize: 11, fontWeight: "500", marginBottom: 2 },
  summaryValueSmall: { color: "#E2E8F0", fontSize: 15, fontWeight: "700" },

  // Filter
  filterContainer: { marginBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#1A2A40", marginBottom: 8 },
  searchInput: { flex: 1, color: "#E2E8F0", fontSize: 14, marginLeft: 8, padding: 0 },
  filterChips: { flexDirection: "row", marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40", marginRight: 8 },
  chipActive: { backgroundColor: "#1E3A5F", borderColor: "#3B82F6" },
  chipText: { color: "#8892A4", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#3B82F6" },

  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  sectionTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700" },

  // Empty state
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { color: "#8892A4", fontSize: 14, marginTop: 12, textAlign: "center" },

  // Employee Card
  employeeCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1A2A40" },
  employeeHeader: { flexDirection: "row", alignItems: "center" },
  employeeInfo: { flex: 1 },
  employeeName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  employeeMeta: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  employeePayInfo: { alignItems: "flex-end" },
  employeePay: { color: "#10B981", fontSize: 15, fontWeight: "700" },
  employeeHours: { color: "#8892A4", fontSize: 12, marginTop: 1 },

  // Expanded Details
  employeeDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A2A40" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  detailLabel: { color: "#8892A4", fontSize: 13 },
  detailValue: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },

  // Production badge
  productionBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1040", borderRadius: 8, padding: 8, marginTop: 8, gap: 6 },
  productionText: { color: "#8B5CF6", fontSize: 12, fontWeight: "600" },

  // Time Entries
  entriesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1A2A40" },
  entriesSectionTitle: { color: "#8892A4", fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  entryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0A1628" },
  entryInfo: { flex: 1 },
  entryDate: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  entryTime: { color: "#8892A4", fontSize: 12, marginTop: 1 },
  entryProject: { color: "#5A6A80", fontSize: 11, marginTop: 1 },
  entryClassification: { color: "#8B5CF6", fontSize: 11, marginTop: 1 },
  entryRight: { alignItems: "flex-end", gap: 4 },
  entryHours: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  manualBadge: { backgroundColor: "#1A2A40", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  manualBadgeText: { color: "#F59E0B", fontSize: 10, fontWeight: "600" },
  editEntryButton: { padding: 4 },

  // Project Card
  projectCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  projectName: { flex: 1, color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  projectStats: { flexDirection: "row", gap: 12, alignItems: "center" },
  projectStat: { color: "#8892A4", fontSize: 12 },
  projectPay: { color: "#10B981", fontSize: 13, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#0F1D32", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  modalSubtitle: { color: "#8892A4", fontSize: 13, marginBottom: 16 },
  fieldLabel: { color: "#8892A4", fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  timeButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A2A40", borderRadius: 10, padding: 12, gap: 8 },
  timeButtonText: { color: "#E2E8F0", fontSize: 15, fontWeight: "500" },
  textInput: { backgroundColor: "#1A2A40", borderRadius: 10, padding: 12, color: "#E2E8F0", fontSize: 15 },
  saveButton: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
