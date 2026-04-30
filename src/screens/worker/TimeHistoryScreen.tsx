import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

interface TimeEntry {
  id: number;
  projectId: number;
  clockIn: string;
  clockOut?: string;
  totalHours?: string;
  notes?: string;
  project?: { name: string };
}

export default function TimeHistoryScreen() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const res = await apiClient("/api/trpc/time.getMyEntries", "GET");
      if (res?.result?.data) {
        // Sort by clockIn descending
        const sorted = res.result.data.sort(
          (a: TimeEntry, b: TimeEntry) =>
            new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
        );
        setEntries(sorted);
      }
    } catch (err) {
      console.error("Failed to load time entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderEntry = ({ item }: { item: TimeEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(item.clockIn)}</Text>
        <View
          style={[
            styles.statusBadge,
            item.clockOut ? styles.completedBadge : styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.clockOut ? styles.completedText : styles.activeText,
            ]}
          >
            {item.clockOut ? "Completed" : "Active"}
          </Text>
        </View>
      </View>

      <Text style={styles.entryProject}>
        {item.project?.name || `Project #${item.projectId}`}
      </Text>

      <View style={styles.entryTimes}>
        <View style={styles.timeBlock}>
          <Ionicons name="play-circle-outline" size={16} color="#22C55E" />
          <Text style={styles.timeText}>{formatTime(item.clockIn)}</Text>
        </View>
        {item.clockOut && (
          <>
            <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
            <View style={styles.timeBlock}>
              <Ionicons name="stop-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.timeText}>{formatTime(item.clockOut)}</Text>
            </View>
          </>
        )}
      </View>

      {item.totalHours && (
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={16} color="#2563EB" />
          <Text style={styles.hoursText}>{item.totalHours}h total</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No time entries yet</Text>
          <Text style={styles.emptySubtext}>
            Your clock in/out history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  entryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: "#F0FDF4",
  },
  activeBadge: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  completedText: {
    color: "#22C55E",
  },
  activeText: {
    color: "#F59E0B",
  },
  entryProject: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  entryTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  timeBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  hoursText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
});
