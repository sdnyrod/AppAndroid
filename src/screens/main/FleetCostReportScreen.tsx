import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface VehicleCost {
  vehicleId: number;
  internalNumber: string;
  make: string;
  model: string;
  year: number | null;
  totalMiles: number;
  totalMileageCost: number;
  totalFuelCost: number;
  totalFuelGallons: number;
  totalTrips: number;
  grandTotal: number;
}

interface MonthlyReport {
  vehicles: VehicleCost[];
  totals: {
    totalMiles: number;
    totalMileageCost: number;
    totalFuelCost: number;
    totalFuelGallons: number;
    totalTrips: number;
    grandTotal: number;
  };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function FleetCostReportScreen() {
  const { t } = useLanguageStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<MonthlyReport>("fleet.monthlyReport", { year, month });
      if (res.ok && res.data) {
        setReport(res.data);
      } else {
        setReport(null);
        if (res.error) setError(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const changeMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const renderVehicle = ({ item }: { item: VehicleCost }) => {
    const label = item.internalNumber
      ? `#${item.internalNumber} ${item.make || ""} ${item.model || ""}`.trim()
      : `Vehicle #${item.vehicleId}`;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="car-outline" size={16} color="#60A5FA" />
          <Text style={styles.vehicleText} numberOfLines={1}>{label}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{item.totalTrips}</Text>
              <Text style={styles.metricLabel}>{t("tripLog.trips") || "Trips"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{item.totalMiles.toFixed(0)} mi</Text>
              <Text style={styles.metricLabel}>{t("mileageLog.totalMiles") || "Miles"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>${item.totalMileageCost.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t("mileageLog.mileageCost") || "Mileage"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>${item.totalFuelCost.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>{t("tripLog.fuel") || "Fuel"}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("fleetCost.totalCost") || "Total"}</Text>
            <Text style={styles.totalValue}>${item.grandTotal.toFixed(2)}</Text>
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

  const totals = report?.totals;

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{MONTH_NAMES[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color="#E2E8F0" />
        </TouchableOpacity>
      </View>

      {/* KPI Summary */}
      {totals && (
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: "#0F2A1F" }]}>
            <Text style={[styles.kpiNumber, { color: "#6EE7B7" }]}>${totals.grandTotal.toFixed(0)}</Text>
            <Text style={styles.kpiLabel}>{t("fleetCost.totalCost") || "Total Cost"}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{totals.totalMiles.toFixed(0)}</Text>
            <Text style={styles.kpiLabel}>{t("mileageLog.totalMiles") || "Miles"}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>{totals.totalTrips}</Text>
            <Text style={styles.kpiLabel}>{t("tripLog.trips") || "Trips"}</Text>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {(!report || report.vehicles.length === 0) && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("fleetCost.noData") || "No fleet cost data for this month"}</Text>
        </View>
      ) : (
        <FlatList
          data={report?.vehicles || []}
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
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0F1D32",
    borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  monthArrow: { padding: 8 },
  monthText: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  kpiRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8,
  },
  kpiCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  kpiNumber: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  kpiLabel: { color: "#8892A4", fontSize: 10, marginTop: 2, textAlign: "center" },
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
  cardBody: { padding: 14, gap: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBox: {
    width: "47%", backgroundColor: "#1A2A40", borderRadius: 8, padding: 10,
  },
  metricValue: { color: "#E2E8F0", fontSize: 15, fontWeight: "700" },
  metricLabel: { color: "#8892A4", fontSize: 10, marginTop: 2 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 8, borderTopWidth: 1, borderTopColor: "#1A2A40",
  },
  totalLabel: { color: "#8892A4", fontSize: 13, fontWeight: "600" },
  totalValue: { color: "#6EE7B7", fontSize: 18, fontWeight: "700" },
});
