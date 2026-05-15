import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface TimeEntry {
  id: number;
  userId: number;
  projectId: number | null;
  clockIn: string;
  clockOut: string | null;
  totalHours: string | null;
  regularHours: string | null;
  overtimeHours: string | null;
  payRate: string | null;
  totalPay: string | null;
  projectName?: string | null;
  notes?: string | null;
}

type PeriodKey = "thisWeek" | "lastWeek" | "last30";

function getWeekRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day + (offset * 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { start: startOfWeek, end: endOfWeek };
}

function getLast30Days(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export default function MyHoursScreen() {
  const { t } = useLanguageStore();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("thisWeek");

  const dateRange = useMemo(() => {
    switch (period) {
      case "thisWeek": return getWeekRange(0);
      case "lastWeek": return getWeekRange(-1);
      case "last30": return getLast30Days();
    }
  }, [period]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<TimeEntry[]>("time.getMyEntries", {
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      if (res.ok && res.data) {
        setEntries(Array.isArray(res.data) ? res.data : []);
      } else {
        setEntries([]);
        if (res.error) setError(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalHours = entries.reduce((s, e) => s + parseFloat(e.totalHours || "0"), 0);
    const regularHours = entries.reduce((s, e) => s + parseFloat(e.regularHours || "0"), 0);
    const overtimeHours = entries.reduce((s, e) => s + parseFloat(e.overtimeHours || "0"), 0);
    const totalPay = entries.reduce((s, e) => s + parseFloat(e.totalPay || "0"), 0);
    return { totalHours, regularHours, overtimeHours, totalPay };
  }, [entries]);

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch { return dateStr; }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return dateStr; }
  };

  const periodLabels: Record<PeriodKey, string> = {
    thisWeek: t("myHours.thisWeek") || "This Week",
    lastWeek: t("myHours.lastWeek") || "Last Week",
    last30: t("myHours.last30") || "Last 30 Days",
  };

  const renderEntry = ({ item }: { item: TimeEntry }) => {
    const hours = parseFloat(item.totalHours || "0");
    const ot = parseFloat(item.overtimeHours || "0");
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>{formatDate(item.clockIn)}</Text>
            <Text style={styles.timeRange}>
              {formatTime(item.clockIn)}{item.clockOut ? " \u2013 " + formatTime(item.clockOut) : " \u2013 Active"}
            </Text>
          </View>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursValue}>{hours.toFixed(1)}h</Text>
            {ot > 0 && <Text style={styles.otLabel}>+{ot.toFixed(1)} OT</Text>}
          </View>
        </View>
        {(item.projectName || item.totalPay) && (
          <View style={styles.cardBody}>
            {item.projectName && (
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={13} color="#8892A4" />
                <Text style={styles.infoText}>{item.projectName}</Text>
              </View>
            )}
            {item.totalPay && parseFloat(item.totalPay) > 0 && (
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={13} color="#6EE7B7" />
                <Text style={[styles.infoText, { color: "#6EE7B7" }]}>
                  ${parseFloat(item.totalPay).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}
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
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(["thisWeek", "lastWeek", "last30"] as PeriodKey[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {periodLabels[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalHours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t("myHours.hoursWorked") || "Hours"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.regularHours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t("payroll.regular") || "Regular"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#F59E0B" }]}>{stats.overtimeHours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t("payroll.overtime") || "OT"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#6EE7B7" }]}>${stats.totalPay.toFixed(0)}</Text>
          <Text style={styles.statLabel}>{t("myHours.totalEarnings") || "Earnings"}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {entries.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("myHours.noEntries") || "No time entries for this period"}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEntry}
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
  periodRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  periodChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
    backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40",
  },
  periodChipActive: { backgroundColor: "#1E3A5F", borderColor: "#3B82F6" },
  periodText: { color: "#8892A4", fontSize: 12 },
  periodTextActive: { color: "#60A5FA", fontWeight: "600" },
  statsRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  statNumber: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#8892A4", fontSize: 9, marginTop: 2, textAlign: "center" },
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
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dateLabel: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  timeRange: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  hoursBox: { alignItems: "flex-end" },
  hoursValue: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  otLabel: { color: "#F59E0B", fontSize: 11, fontWeight: "600" },
  cardBody: {
    paddingHorizontal: 14, paddingBottom: 10, gap: 6,
    borderTopWidth: 1, borderTopColor: "#1A2A40", paddingTop: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { color: "#CBD5E1", fontSize: 12 },
});
