import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TextInput, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface InventoryItem {
  inventory: {
    id: number;
    quantity: string;
    unit: string;
    minQuantity: string | null;
    maxQuantity: string | null;
    avgCostPerUnit: string | null;
    lastPurchasePrice: string | null;
    locationType: string;
  };
  material: {
    id: number;
    name: string;
    category: string;
    sku: string | null;
    description: string | null;
    unit: string;
  };
  warehouse: {
    id: number;
    name: string;
  } | null;
  vehicle: {
    id: number;
    internalNumber: string;
    equipmentType: string | null;
  } | null;
}

function formatCurrency(value: string | number | null): string {
  if (!value) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `$${num.toFixed(2)}`;
}

function formatQuantity(value: string | number | null): string {
  if (!value) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

export default function InventoryItemsScreen() {
  const { t } = useLanguageStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get<InventoryItem[]>("inventory.list");
      const list = data || [];
      setItems(list);
      setFiltered(list);
    } catch {
      // Network error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(items);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(items.filter((item) =>
      (item.material?.name || "").toLowerCase().includes(q) ||
      (item.material?.category || "").toLowerCase().includes(q) ||
      (item.material?.sku || "").toLowerCase().includes(q) ||
      (item.warehouse?.name || "").toLowerCase().includes(q)
    ));
  }, [search, items]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getStockStatus = (item: InventoryItem) => {
    const qty = parseFloat(item.inventory.quantity || "0");
    const min = item.inventory.minQuantity ? parseFloat(item.inventory.minQuantity) : null;
    if (min !== null && qty <= 0) return { label: "Out of Stock", color: "#EF4444" };
    if (min !== null && qty <= min) return { label: "Low Stock", color: "#F59E0B" };
    return { label: "In Stock", color: "#10B981" };
  };

  const getLocationName = (item: InventoryItem): string => {
    if (item.inventory.locationType === "warehouse" && item.warehouse) {
      return item.warehouse.name;
    }
    if (item.inventory.locationType === "truck" && item.vehicle) {
      return `${item.vehicle.internalNumber}${item.vehicle.equipmentType ? ` - ${item.vehicle.equipmentType}` : ""}`;
    }
    return "—";
  };

  const getLocationIcon = (item: InventoryItem): string => {
    return item.inventory.locationType === "truck" ? "car" : "business";
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const qty = formatQuantity(item.inventory.quantity);
    const totalValue = item.inventory.avgCostPerUnit
      ? (parseFloat(item.inventory.quantity || "0") * parseFloat(item.inventory.avgCostPerUnit)).toFixed(2)
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.materialIcon}>
            <Ionicons name="cube" size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.materialName}>{item.material?.name || "Unknown"}</Text>
            <View style={styles.metaRow}>
              {item.material?.sku && (
                <Text style={styles.sku}>SKU: {item.material.sku}</Text>
              )}
              <Text style={styles.category}>{item.material?.category || ""}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>QUANTITY</Text>
            <Text style={styles.detailValue}>{qty} {item.inventory.unit}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>LOCATION</Text>
            <View style={styles.locationRow}>
              <Ionicons name={getLocationIcon(item) as any} size={12} color="#8892A4" />
              <Text style={styles.detailValue} numberOfLines={1}>{getLocationName(item)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>UNIT COST</Text>
            <Text style={styles.detailValue}>{formatCurrency(item.inventory.avgCostPerUnit)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>TOTAL VALUE</Text>
            <Text style={[styles.detailValue, { color: "#10B981" }]}>
              {totalValue ? `$${parseFloat(totalValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
            </Text>
          </View>
        </View>

        {(item.inventory.minQuantity || item.inventory.maxQuantity) && (
          <View style={styles.levelsRow}>
            {item.inventory.minQuantity && (
              <Text style={styles.levelText}>Min: {formatQuantity(item.inventory.minQuantity)} {item.inventory.unit}</Text>
            )}
            {item.inventory.maxQuantity && (
              <Text style={styles.levelText}>Max: {formatQuantity(item.inventory.maxQuantity)} {item.inventory.unit}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#5A6A80" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#5A6A80"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#5A6A80" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.inventory.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={40} color="#5A6A80" />
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32",
    margin: 16, marginBottom: 0, borderRadius: 10, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: "#1A2A40", gap: 8,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  summaryRow: { paddingHorizontal: 16, paddingVertical: 8 },
  summaryText: { color: "#8892A4", fontSize: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#0F1D32", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#1A2A40",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  materialIcon: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: "#1E3A5F",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  materialName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  sku: { color: "#5A6A80", fontSize: 11 },
  category: { color: "#8892A4", fontSize: 11, textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  detailsGrid: { flexDirection: "row", marginTop: 12, gap: 12 },
  detailItem: { flex: 1 },
  detailLabel: { color: "#5A6A80", fontSize: 10, marginBottom: 2 },
  detailValue: { color: "#E2E8F0", fontSize: 13, fontWeight: "500" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  levelsRow: {
    flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#1A2A40",
  },
  levelText: { color: "#8892A4", fontSize: 11 },
  emptyCard: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#5A6A80", fontSize: 14 },
});
