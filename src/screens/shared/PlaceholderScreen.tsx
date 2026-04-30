import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";

interface Props {
  route: {
    params?: {
      title?: string;
      role?: string;
    };
  };
}

export default function PlaceholderScreen({ route }: Props) {
  const title = route.params?.title || "Screen";
  const role = route.params?.role || "unknown";
  const { user, logout } = useAuthStore();
  const { isOnline, pendingCount } = useSyncStore();

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            ⚡ Offline Mode {pendingCount > 0 ? `(${pendingCount} pending)` : ""}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {user?.name} • {role}
        </Text>
        <Text style={styles.description}>
          This screen will mirror the web functionality for the {role} role.
        </Text>
        <Text style={styles.comingSoon}>Feature implementation in progress</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  offlineBanner: {
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  offlineText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#3B82F6",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#8892A4",
    textAlign: "center",
    lineHeight: 20,
  },
  comingSoon: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 24,
    fontStyle: "italic",
  },
  logoutButton: {
    margin: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "600",
  },
});
