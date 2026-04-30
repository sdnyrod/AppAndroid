import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { usePermissionsStore } from "@/store/permissionsStore";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { role, isOwner } = usePermissionsStore();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || "U").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.roleText}>{isOwner ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <InfoRow icon="mail-outline" label="Email" value={user?.email || "—"} />
        <InfoRow icon="call-outline" label="Phone" value={user?.phone || "—"} />
        <InfoRow icon="business-outline" label="Company" value={user?.tenantName || "—"} />
        <InfoRow icon="globe-outline" label="Language" value={(user?.language || "en").toUpperCase()} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color="#5A6A80" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  content: { padding: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { color: "#3B82F6", fontSize: 32, fontWeight: "700" },
  name: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  roleText: { color: "#8892A4", fontSize: 14, marginTop: 4 },
  infoSection: { backgroundColor: "#0F1D32", borderRadius: 12, borderWidth: 1, borderColor: "#1A2A40", marginBottom: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1A2A40", gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: "#5A6A80", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { color: "#E2E8F0", fontSize: 14, marginTop: 2 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#1C1017", borderRadius: 10, borderWidth: 1, borderColor: "#7F1D1D" },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});
