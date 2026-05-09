import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

import { useLanguageStore } from "@/store/languageStore";
export default function EmployeesScreen() {
  const { t } = useLanguageStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get<any[]>("users.getEmployees");
      setEmployees(data || []);
      setFiltered(data || []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(employees); return; }
    const q = search.toLowerCase();
    setFiltered(employees.filter((e) =>
      (e.name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.role || "").toLowerCase().includes(q)
    ));
  }, [search, employees]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#5A6A80" />
        <TextInput style={styles.searchInput} placeholder={t("employees.search")} placeholderTextColor="#5A6A80" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.email || item.phone || ""}</Text>
              <Text style={styles.role}>{item.role || item.jobTitle || ""}</Text>
            </View>
            <View style={[styles.statusBadge, item.status === "active" ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{item.status || "active"}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#5A6A80" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", margin: 16, borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: "#1A2A40", gap: 8 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#3B82F6", fontSize: 16, fontWeight: "600" },
  info: { flex: 1 },
  name: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  detail: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  role: { color: "#5A6A80", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeActive: { backgroundColor: "#064E3B" },
  badgeInactive: { backgroundColor: "#1E3A5F" },
  badgeText: { color: "#E2E8F0", fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#5A6A80", fontSize: 14 },
});
