import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

interface RevenueData {
  period: {
    revenue: number;
    commission: number;
    invoiceCount: number;
    commissionRate: number;
  };
  accumulated: {
    revenue: number;
    commission: number;
    invoiceCount: number;
  };
  monthly: Array<{
    month: string;
    revenue: number;
    commission: number;
    invoiceCount: number;
  }>;
}

export default function CommissionsScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  const isDirector = user?.isSuperOwner || user?.role === "owner";

  const loadCommissions = useCallback(async () => {
    try {
      const procedure = isDirector
        ? "director.getDirectorRevenue"
        : "salesperson.getSalespersonRevenue";

      const res = await apiClient.get<RevenueData>(procedure);
      if (res) {
        setRevenue(res);
      }
    } catch (err) {
      console.error("Failed to load commissions:", err);
    } finally {
      setLoading(false);
    }
  }, [isDirector]);

  useEffect(() => {
    loadCommissions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommissions();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Important Notice */}
      <View style={styles.noticeBanner}>
        <Ionicons name="information-circle" size={20} color="#1D4ED8" />
        <Text style={styles.noticeText}>
          Commissions are confirmed only after client payment is received. Trial subscriptions do not generate commissions.
        </Text>
      </View>

      {/* Lifetime Earnings */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>CONFIRMED EARNINGS</Text>
        <Text style={styles.earningsValue}>
          {revenue ? formatCurrency(revenue.accumulated.commission) : "$0.00"}
        </Text>
        <Text style={styles.earningsSubtext}>
          Based on {revenue?.accumulated.invoiceCount || 0} confirmed payments
        </Text>
      </View>

      {/* Period Stats */}
      <View style={styles.periodCard}>
        <Text style={styles.periodTitle}>This Month</Text>
        <View style={styles.periodGrid}>
          <View style={styles.periodStat}>
            <Text style={styles.periodValue}>
              {revenue ? formatCurrency(revenue.period.revenue) : "$0.00"}
            </Text>
            <Text style={styles.periodLabel}>Revenue</Text>
          </View>
          <View style={styles.periodDivider} />
          <View style={styles.periodStat}>
            <Text style={[styles.periodValue, styles.commissionValue]}>
              {revenue ? formatCurrency(revenue.period.commission) : "$0.00"}
            </Text>
            <Text style={styles.periodLabel}>Your Commission</Text>
          </View>
          <View style={styles.periodDivider} />
          <View style={styles.periodStat}>
            <Text style={styles.periodValue}>
              {revenue?.period.commissionRate
                ? `${(revenue.period.commissionRate * 100).toFixed(0)}%`
                : "—"}
            </Text>
            <Text style={styles.periodLabel}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Monthly Breakdown */}
      {revenue?.monthly && revenue.monthly.length > 0 && (
        <View style={styles.monthlySection}>
          <Text style={styles.sectionTitle}>Monthly Detail</Text>
          {revenue.monthly.map((month, idx) => (
            <View key={idx} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{month.month}</Text>
              <View style={styles.monthValues}>
                <Text style={styles.monthRevenue}>
                  {formatCurrency(month.revenue)}
                </Text>
                <Text style={styles.monthCommission}>
                  {formatCurrency(month.commission)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  earningsCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#22C55E",
  },
  earningsSubtext: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
  },
  periodCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 16,
  },
  periodGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodStat: {
    flex: 1,
    alignItems: "center",
  },
  periodDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
  },
  periodValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  commissionValue: {
    color: "#22C55E",
  },
  periodLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  monthlySection: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  monthLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  monthValues: {
    alignItems: "flex-end",
  },
  monthRevenue: {
    fontSize: 13,
    color: "#64748B",
  },
  monthCommission: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22C55E",
    marginTop: 2,
  },
});
