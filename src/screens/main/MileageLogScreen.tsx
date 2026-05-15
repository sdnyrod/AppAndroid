import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface VehicleSummary {
  vehicleId: number;
  vehicleNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  totalMiles: number;
  totalCost: number;
  totalFuelCost: number;
  totalFuelGallons: number;
  tripCount: number;
}

export default function MileageLogScreen() {
  const { t } = useLanguageStore();
  const [data, setData] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<VehicleSummary[]>("fleet.vehicleTripSummary", {});
      if (res.ok && res.data) {
        setData(Array.isArray(res.data) ? res.data : []);
      } else {
        setData([]);
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

  const totals = useMemo(() => {
    if (!data.length) return { miles: 0, cost: 0, fuel: 0, trips: 0 };
    return {
      miles: data.reduce((s, v) => s + v.totalMiles, 0),
      cost: data.reduce((s, v) => s + v.totalCost, 0),
      fuel: data.reduce((s, v) => s + v.totalFuelCost, 0),
      trips: data.reduce((s, v) => s + v.tripCount, 0),
    };
  }, [data]);

  const renderVehicle = ({ item }: { item: VehicleSummary }) => {
    const label = item.vehicleNumber
      ? `#${item.vehicleNumber}${item.vehicleMake ? " " + item.vehicleMake : ""}${item.vehicleModel ? " " + item.vehicleModel : ""}`
      : `Vehicle #${item.vehicleId}`;
    const costPerMile = item.totalMiles > 0 ? item.totalCost / item.totalMiles : 0;
    const mpg = item.totalFuelGallons > 0 ? item.totalMiles / item.totalFuelGallons : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="car-outline" size={18} color="#60A5FA" />
          <Text style={styles.vehicleText} numberOfLines={1}>{label}</Text>
          <View style={styles.tripCountBadge}>
            <Text style={styles.tripCountText}>{item.tripCount} {t("tripLog.trips") || "trips"}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{item.totalMiles.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>{t("mileageLog.totalMiles") || "Miles"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>${item.totalCost.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t("mileageLog.mileageCost") || "Mileage Cost"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>${item.totalFuelCost.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t("tripLog.fuel") || "Fuel"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>${costPerMile.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t("fleetCost.costPerMile") || "$/Mile"}</Text>
            </View>
          </View>
          {mpg > 0 && (
            <View style={styles.mpgRow}>
              <Ionicons name="flame-outline" size={13} color="#F59E0B" />
              <Text style={styles.mpgText}>{mpg.toFixed(1)} MPG</Text>
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
      {/* Totals */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totals.miles.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("mileageLog.totalMiles") || "Total Miles"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>${totals.cost.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>{t("fleetCost.totalCost") || "Total Cost"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totals.trips}</Text>
          <Text style={styles.summaryLabel}>{t("tripLog.trips") || "Trips"}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {data.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="speedometer-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("mileageLog.noData") || "No mileage data available"}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.vehicleId.toString()}
          renderItem={renderVehicle}
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
  summaryLabel: { color: "#8892A4", fontSize: 10, marginTop: 2, textAlign: "center" },
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
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  vehicleText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600", flex: 1 },
  tripCountBadge: {
    backgroundColor: "#1E3A5F", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  tripCountText: { color: "#60A5FA", fontSize: 11, fontWeight: "600" },
  cardBody: { padding: 14, gap: 10 },
  metricsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  metricBox: {
    width: "47%", backgroundColor: "#1A2A40", borderRadius: 8, padding: 10,
  },
  metricValue: { color: "#E2E8F0", fontSize: 16, fontWeight: "700" },
  metricLabel: { color: "#8892A4", fontSize: 10, marginTop: 2 },
  mpgRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1A2A40", borderRadius: 8, padding: 8, alignSelf: "flex-start",
  },
  mpgText: { color: "#F59E0B", fontSize: 12, fontWeight: "600" },
});
