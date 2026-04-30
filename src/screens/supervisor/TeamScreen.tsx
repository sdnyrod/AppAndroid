import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

interface TeamMember {
  id: number;
  name: string;
  email?: string;
  role: string;
  isClockedIn: boolean;
  activeEntry?: {
    clockIn: string;
    projectName: string;
  };
}

export default function TeamScreen() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "idle">("all");

  const loadTeam = useCallback(async () => {
    try {
      // Get team roster with attendance status
      const res = await apiClient("/api/trpc/employee.getTeamRoster", "GET");
      if (res?.result?.data) {
        setMembers(res.result.data);
      }
    } catch (err) {
      console.error("Failed to load team:", err);
      // Fallback: try getting all employees
      try {
        const fallback = await apiClient("/api/trpc/employee.getAll", "GET");
        if (fallback?.result?.data) {
          setMembers(
            fallback.result.data.map((e: any) => ({
              id: e.id,
              name: e.name || e.email,
              email: e.email,
              role: e.role,
              isClockedIn: false,
            }))
          );
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeam();
    setRefreshing(false);
  };

  const filteredMembers = members.filter((m) => {
    if (filter === "active") return m.isClockedIn;
    if (filter === "idle") return !m.isClockedIn;
    return true;
  });

  const getElapsed = (clockIn: string) => {
    const diff = Date.now() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const renderMember = ({ item }: { item: TeamMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberRow}>
        <View
          style={[
            styles.statusDot,
            item.isClockedIn ? styles.dotActive : styles.dotIdle,
          ]}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.isClockedIn && item.activeEntry ? (
            <Text style={styles.memberStatus}>
              {item.activeEntry.projectName} • {getElapsed(item.activeEntry.clockIn)}
            </Text>
          ) : (
            <Text style={styles.memberIdle}>Not clocked in</Text>
          )}
        </View>
        {item.isClockedIn && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>Working</Text>
          </View>
        )}
      </View>
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
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["all", "active", "idle"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all"
                ? `All (${members.length})`
                : f === "active"
                ? `Active (${members.filter((m) => m.isClockedIn).length})`
                : `Idle (${members.filter((m) => !m.isClockedIn).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team List */}
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No team members found</Text>
          </View>
        }
      />
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
  },
  filterRow: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFF",
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  memberCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  dotActive: {
    backgroundColor: "#22C55E",
  },
  dotIdle: {
    backgroundColor: "#CBD5E1",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  memberStatus: {
    fontSize: 12,
    color: "#22C55E",
    marginTop: 2,
  },
  memberIdle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 12,
  },
});
