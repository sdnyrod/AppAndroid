import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

import { useLanguageStore } from "@/store/languageStore";
interface GenericScreenProps {
  title: string;
  icon: string;
  procedure?: string; // tRPC procedure to call for data
  emptyMessage?: string;
  renderItem?: (item: any) => React.ReactElement;
}

/**
 * A reusable screen shell that fetches data from a tRPC procedure
 * and displays it in a list. Used as a base for all feature screens.
 */
export default function GenericScreen({
  title,
  icon,
  procedure,
  emptyMessage = t("common.noData"),
  renderItem,
}: GenericScreenProps) {
  const { t } = useLanguageStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!procedure) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await apiClient.get(procedure);
      if (Array.isArray(result)) {
        setData(result);
      } else if (result && typeof result === "object") {
        // Some endpoints return { items: [...] } or { data: [...] }
        const items = (result as any).items || (result as any).data || (result as any).entries || [];
        setData(Array.isArray(items) ? items : [result]);
      } else {
        setData([]);
      }
    } catch (e: any) {
      setError(e?.message || t("common.networkError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [procedure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name={icon as any} size={48} color="#5A6A80" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>{t("common.refresh")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const defaultRenderItem = ({ item }: { item: any }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemTitle}>
        {item.name || item.title || item.label || item.description || JSON.stringify(item).slice(0, 60)}
      </Text>
      {item.status && (
        <View style={[styles.badge, item.status === "active" ? styles.badgeActive : styles.badgeDefault]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      data={data}
      keyExtractor={(item, index) => item.id?.toString() || index.toString()}
      renderItem={renderItem ? ({ item }) => renderItem(item) : defaultRenderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3B82F6"
          colors={["#3B82F6"]}
        />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
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
  emptyText: {
    color: "#8892A4",
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
  list: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  listItemTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: "#064E3B",
  },
  badgeDefault: {
    backgroundColor: "#1E3A5F",
  },
  badgeText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
