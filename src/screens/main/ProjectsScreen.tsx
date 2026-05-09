import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TextInput, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface Project {
  id: number;
  name: string;
  address?: string;
  clientName?: string;
  status?: string;
}

export default function ProjectsScreen() {
  const { t } = useLanguageStore();
  const navigation = useNavigation<any>();
  const labels = useLanguageStore((s) => s.labels);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      const projectList = data || [];
      setProjects(projectList);
      setFiltered(projectList);
    } catch {
      // Network error — keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(projects);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(projects.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.address || "").toLowerCase().includes(q) ||
      (p.clientName || "").toLowerCase().includes(q)
    ));
  }, [search, projects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#5A6A80" />
        <TextInput
          style={styles.searchInput}
          placeholder={labels.searchProjects}
          placeholderTextColor="#5A6A80"
          value={search}
          onChangeText={setSearch}
        />
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
            onPress={() => navigation.navigate("JobCost", { projectId: item.id })}
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
            <View style={[styles.statusBadge, item.status === "active" ? styles.badgeActive : styles.badgeDefault]}>
              <Text style={styles.badgeText}>{item.status || "active"}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-outline" size={40} color="#5A6A80" />
            <Text style={styles.emptyText}>{labels.noProjectsFound}</Text>
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
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 12 },
  info: { flex: 1 },
  name: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  address: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  client: { color: "#5A6A80", fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeActive: { backgroundColor: "#064E3B" },
  badgeDefault: { backgroundColor: "#1E3A5F" },
  badgeText: { color: "#E2E8F0", fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { color: "#5A6A80", fontSize: 14 },
});
