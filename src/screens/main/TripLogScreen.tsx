import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface TripLog {
  id: number;
  vehicleId: number;
  projectId: number | null;
  driverId: number;
  date: string;
  tripType: string;
  origin: string | null;
  destination: string | null;
  startOdometer: string | null;
  endOdometer: string | null;
  totalMiles: string;
  costPerMile: string | null;
  totalCost: string | null;
  fuelGallons: string | null;
  fuelCost: string | null;
  notes: string | null;
  vehicleNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  projectName: string | null;
  driverName: string | null;
}

const TRIP_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  commute_to_job: { bg: "#1E3A5F", text: "#60A5FA" },
  between_jobs: { bg: "#4C1D95", text: "#C4B5FD" },
  supply_run: { bg: "#78350F", text: "#FCD34D" },
  return_home: { bg: "#064E3B", text: "#6EE7B7" },
  office_to_job: { bg: "#164E63", text: "#67E8F9" },
  other: { bg: "#1E293B", text: "#94A3B8" },
};

export default function TripLogScreen() {
  const { t } = useLanguageStore();
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripTypeLabels: Record<string, string> = useMemo(() => ({
    commute_to_job: t("tripLog.commuteToJob") || "Commute to Job",
    between_jobs: t("tripLog.betweenJobs") || "Between Jobs",
    supply_run: t("tripLog.supplyRun") || "Supply Run",
    return_home: t("tripLog.returnHome") || "Return Home",
    office_to_job: t("tripLog.officeToJob") || "Office to Job",
    other: t("tripLog.other") || "Other",
  }), [t]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<TripLog[]>("fleet.listTrips", { limit: 200 });
      if (res.ok && res.data) {
        setTrips(Array.isArray(res.data) ? res.data : []);
      } else {
        setTrips([]);
        if (res.error) setError(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    if (!trips.length) return { totalMiles: 0, totalCost: 0, totalFuel: 0, tripCount: 0 };
    return {
      totalMiles: trips.reduce((s, tr) => s + parseFloat(tr.totalMiles || "0"), 0),
      totalCost: trips.reduce((s, tr) => s + parseFloat(tr.totalCost || "0"), 0),
      totalFuel: trips.reduce((s, tr) => s + parseFloat(tr.fuelCost || "0"), 0),
      tripCount: trips.length,
    };
  }, [trips]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return dateStr; }
  };

  const renderTrip = ({ item }: { item: TripLog }) => {
    const typeColor = TRIP_TYPE_COLORS[item.tripType] || TRIP_TYPE_COLORS.other;
    const vehicleLabel = item.vehicleNumber
      ? `#${item.vehicleNumber}${item.vehicleMake ? " " + item.vehicleMake : ""}`
      : "";
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.topRow}>
              <Text style={styles.dateLabel}>{formatDate(item.date)}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                <Text style={[styles.typeText, { color: typeColor.text }]}>
                  {tripTypeLabels[item.tripType] || item.tripType}
                </Text>
              </View>
            </View>
            {(item.origin || item.destination) && (
              <View style={styles.routeRow}>
                <Ionicons name="navigate-outline" size={13} color="#8892A4" />
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.origin || "?"} \u2192 {item.destination || "?"}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Ionicons name="speedometer-outline" size={14} color="#8892A4" />
              <Text style={styles.metricValue}>{parseFloat(item.totalMiles || "0").toFixed(1)} mi</Text>
            </View>
            {item.totalCost && parseFloat(item.totalCost) > 0 && (
              <View style={styles.metric}>
                <Ionicons name="cash-outline" size={14} color="#8892A4" />
                <Text style={styles.metricValue}>${parseFloat(item.totalCost).toFixed(2)}</Text>
              </View>
            )}
            {item.fuelCost && parseFloat(item.fuelCost) > 0 && (
              <View style={styles.metric}>
                <Ionicons name="flame-outline" size={14} color="#F59E0B" />
                <Text style={styles.metricValue}>${parseFloat(item.fuelCost).toFixed(2)}</Text>
              </View>
            )}
          </View>
          <View style={styles.detailsRow}>
            {vehicleLabel ? (
              <View style={styles.detailChip}>
                <Ionicons name="car-outline" size={12} color="#8892A4" />
                <Text style={styles.detailText}>{vehicleLabel}</Text>
              </View>
            ) : null}
            {item.driverName ? (
              <View style={styles.detailChip}>
                <Ionicons name="person-outline" size={12} color="#8892A4" />
                <Text style={styles.detailText}>{item.driverName}</Text>
              </View>
            ) : null}
            {item.projectName ? (
              <View style={styles.detailChip}>
                <Ionicons name="business-outline" size={12} color="#8892A4" />
                <Text style={styles.detailText} numberOfLines={1}>{item.projectName}</Text>
              </View>
            ) : null}
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
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{stats.tripCount}</Text>
          <Text style={styles.summaryLabel}>{t("tripLog.trips") || "Trips"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{stats.totalMiles.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("tripLog.miles") || "Miles"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>${stats.totalCost.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("tripLog.cost") || "Cost"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>${stats.totalFuel.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("tripLog.fuel") || "Fuel"}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {trips.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("tripLog.noTrips") || "No trips recorded"}</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrip}
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
  summaryRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8,
  },
  summaryCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  summaryNumber: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  summaryLabel: { color: "#8892A4", fontSize: 10, marginTop: 2 },
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
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  topRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  dateLabel: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: "600" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  routeText: { color: "#8892A4", fontSize: 12, flex: 1 },
  cardBody: { padding: 14, gap: 8 },
  metricsRow: { flexDirection: "row", gap: 16 },
  metric: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricValue: { color: "#CBD5E1", fontSize: 13, fontWeight: "500" },
  detailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  detailChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#1A2A40", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  detailText: { color: "#8892A4", fontSize: 11 },
});
