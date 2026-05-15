import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface Assignment {
  id: number;
  vehicleId: number;
  projectId: number;
  driverId: number | null;
  date: string;
  status: string;
  notes: string | null;
  vehicleNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  projectName: string | null;
  driverName: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "#1E3A5F", text: "#60A5FA" },
  in_transit: { bg: "#78350F", text: "#FCD34D" },
  on_site: { bg: "#064E3B", text: "#6EE7B7" },
  completed: { bg: "#1E293B", text: "#94A3B8" },
  cancelled: { bg: "#7F1D1D", text: "#FCA5A5" },
};

export default function DispatchScreen() {
  const { t } = useLanguageStore();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<Assignment[]>("dispatch.getByDate", {
        date: selectedDate,
      });
      if (res.ok && res.data) {
        setAssignments(Array.isArray(res.data) ? res.data : []);
      } else {
        setAssignments([]);
        if (res.error && res.status !== 403) {
          setError(res.error);
        }
      }
    } catch (e: any) {
      setError(e?.message || t("common.networkError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const changeDate = (days: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  };

  const isToday = () => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: t("dispatch.scheduled") || "Scheduled",
      in_transit: t("dispatch.inTransit") || "In Transit",
      on_site: t("dispatch.onSite") || "On Site",
      completed: t("common.completed") || "Completed",
      cancelled: t("common.cancelled") || "Cancelled",
    };
    return labels[status] || status;
  };

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.scheduled;
    const vehicleLabel = item.vehicleNumber
      ? `#${item.vehicleNumber}${item.vehicleMake ? " " + item.vehicleMake : ""}${item.vehicleModel ? " " + item.vehicleModel : ""}`
      : `Vehicle #${item.vehicleId}`;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.vehicleRow}>
            <Ionicons name="car-outline" size={18} color="#60A5FA" />
            <Text style={styles.vehicleText} numberOfLines={1}>{vehicleLabel}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          {item.projectName && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={14} color="#8892A4" />
              <Text style={styles.infoText}>{item.projectName}</Text>
            </View>
          )}
          {item.driverName && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color="#8892A4" />
              <Text style={styles.infoText}>{item.driverName}</Text>
            </View>
          )}
          {item.notes && (
            <View style={styles.infoRow}>
              <Ionicons name="chatbubble-outline" size={14} color="#8892A4" />
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
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
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#E2E8F0" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {!isToday() && (
            <Text style={styles.todayLink}>{t("common.today") || "Today"}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#E2E8F0" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{assignments.length}</Text>
          <Text style={styles.summaryLabel}>{t("dispatch.assignments") || "Assignments"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {assignments.filter((a) => a.status === "completed").length}
          </Text>
          <Text style={styles.summaryLabel}>{t("common.completed") || "Completed"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {assignments.filter((a) => a.status === "in_transit" || a.status === "on_site").length}
          </Text>
          <Text style={styles.summaryLabel}>{t("dispatch.active") || "Active"}</Text>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* List */}
      {assignments.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bus-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>
            {t("dispatch.noAssignments") || "No dispatch assignments for this date"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAssignment}
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
  dateNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0F1D32",
    borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  dateArrow: { padding: 8 },
  dateCenter: { alignItems: "center" },
  dateText: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  todayLink: { color: "#3B82F6", fontSize: 12, marginTop: 2 },
  summaryRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  summaryCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  summaryNumber: { color: "#E2E8F0", fontSize: 22, fontWeight: "700" },
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
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  vehicleText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { color: "#CBD5E1", fontSize: 13 },
  notesText: { color: "#8892A4", fontSize: 12, flex: 1 },
});
