import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

interface ActiveWorker {
  id: number;
  name: string;
  projectName: string;
  clockIn: string;
  elapsed: string;
}

function getElapsedTime(clockInISO: string): string {
  if (!clockInISO) return "";
  try {
    const clockIn = new Date(clockInISO);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  } catch {
    return "";
  }
}

export default function ActiveWorkersScreen() {
  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await apiClient.get<any[]>("time.getAllActive");
      if (result && Array.isArray(result)) {
        const mapped: ActiveWorker[] = result.map((item: any) => {
          const entry = item.entry || item;
          const user = item.user || {};
          const project = item.project || {};
          const clockIn = entry.clockIn || entry.clockInTime || item.clockIn || "";
          return {
            id: entry.id || user.id || Math.random(),
            name: user.name || item.userName || item.employeeName || "Worker",
            projectName: project.name || item.projectName || "—",
            clockIn,
            elapsed: getElapsedTime(clockIn),
          };
        });
        setWorkers(mapped);
      } else {
        setWorkers([]);
      }
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (workers.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={48} color="#5A6A80" />
        <Text style={styles.emptyText}>No active workers right now</Text>
      </View>
    );
  }

  const renderWorker = ({ item }: { item: ActiveWorker }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name || "W").charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={12} color="#8892A4" />
          <Text style={styles.project}>{item.projectName}</Text>
        </View>
        {item.clockIn ? (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={12} color="#8892A4" />
            <Text style={styles.time}>
              {new Date(item.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {item.elapsed ? ` · ${item.elapsed}` : ""}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.activeBadge}>
        <View style={styles.activeDot} />
        <Text style={styles.activeText}>Active</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{workers.length} Active Workers</Text>
      </View>
      <FlatList
        data={workers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWorker}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  emptyText: { color: "#8892A4", fontSize: 14, marginTop: 12 },

  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  headerCount: { color: "#10B981", fontSize: 14, fontWeight: "700" },

  listContent: { padding: 16 },

  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0F1D32", borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#065F46", justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#10B981", fontSize: 16, fontWeight: "700" },
  info: { flex: 1 },
  name: { color: "#E2E8F0", fontSize: 15, fontWeight: "600", marginBottom: 3 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  project: { color: "#8892A4", fontSize: 12 },
  time: { color: "#8892A4", fontSize: 12 },

  activeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#064E3B", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  activeText: { color: "#10B981", fontSize: 10, fontWeight: "700" },
});
