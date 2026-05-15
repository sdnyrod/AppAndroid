import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TextInput, TouchableOpacity, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface Project {
  id: number;
  name: string;
  address?: string;
  clientName?: string;
  status?: string;
}

const STATUS_FILTER_KEYS = [
  { key: "all", labelKey: "common.all", color: "#8892A4" },
  { key: "active", labelKey: "projects.active", color: "#10B981" },
  { key: "ready_for_billing", labelKey: "projects.billing", color: "#F59E0B" },
  { key: "completed", labelKey: "projects.completed", color: "#3B82F6" },
  { key: "paused", labelKey: "projects.paused", color: "#6B7280" },
];

export default function ProjectsScreen() {
  const { t } = useLanguageStore();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const labels = useLanguageStore((s) => s.labels);

  const STATUS_FILTERS = STATUS_FILTER_KEYS.map(f => ({ ...f, label: t(f.labelKey) }));
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(
    route.params?.statusFilter || "all"
  );

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      const projectList = data || [];
      setProjects(projectList);
    } catch {
      // Network error — keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh data when screen gains focus (e.g., returning from ProjectDetail)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Update filter when navigating with new params (e.g., from Dashboard)
  useEffect(() => {
    if (route.params?.statusFilter) {
      setActiveFilter(route.params.statusFilter);
    }
  }, [route.params?.statusFilter]);

  // Apply both search and status filter
  useEffect(() => {
    let result = projects;

    // Apply status filter
    if (activeFilter !== "all") {
      result = result.filter((p) => (p.status || "active") === activeFilter);
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.clientName || "").toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, projects, activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active": return "#10B981";
      case "ready_for_billing": return "#F59E0B";
      case "completed": return "#3B82F6";
      case "paused": return "#6B7280";
      default: return "#10B981";
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case "active": return "#064E3B";
      case "ready_for_billing": return "#78350F";
      case "completed": return "#1E3A5F";
      case "paused": return "#374151";
      default: return "#064E3B";
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#5A6A80" />
        <TextInput
          style={styles.searchInput}
          placeholder={labels.searchProjects}
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

      {/* Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 40, flexGrow: 0 }}
      >
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              activeFilter === filter.key && { backgroundColor: filter.color + "30", borderColor: filter.color },
            ]}
            onPress={() => setActiveFilter(filter.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter.key && { color: filter.color },
              ]}
            >
              {filter.label}
            </Text>
            {activeFilter === filter.key && filter.key !== "all" && (
              <Text style={[styles.filterCount, { color: filter.color }]}>
                {projects.filter((p) => (p.status || "active") === filter.key).length}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultCountRow}>
        <Text style={styles.resultCount}>
          {filtered.length} {t("projects.title").toLowerCase()}
          {activeFilter !== "all" ? ` • ${STATUS_FILTERS.find(f => f.key === activeFilter)?.label}` : ""}
        </Text>
        {activeFilter !== "all" && (
          <TouchableOpacity onPress={() => setActiveFilter("all")}>
            <Text style={styles.clearFilter}>{t("common.filter")} ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id, projectName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="folder-open" size={20} color="#F59E0B" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
              {item.clientName ? <Text style={styles.client}>{item.clientName}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status || "active") }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(item.status || "active") }]}>
                {(item.status || "active").replace(/_/g, " ")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-outline" size={40} color="#5A6A80" />
            <Text style={styles.emptyText}>
              {activeFilter !== "all"
                ? `No ${STATUS_FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} projects`
                : labels.noProjectsFound}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: "#1A2A40", gap: 8 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#0F1D32", borderWidth: 1, borderColor: "#1A2A40", flexDirection: "row", alignItems: "center", gap: 4, height: 30 },
  filterChipText: { color: "#8892A4", fontSize: 12, fontWeight: "500" },
  filterCount: { fontSize: 11, fontWeight: "700" },
  resultCountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  resultCount: { color: "#5A6A80", fontSize: 12 },
  clearFilter: { color: "#3B82F6", fontSize: 12, fontWeight: "500" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 12 },
  info: { flex: 1 },
  name: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  address: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  client: { color: "#5A6A80", fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#5A6A80", fontSize: 14 },
});
