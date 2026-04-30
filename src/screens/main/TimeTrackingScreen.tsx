import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiClient } from "@/services/api";

export default function TimeTrackingScreen() {
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [active, projs] = await Promise.all([
        apiClient.get("time.getActive"),
        apiClient.get<any[]>("time.getMyAssignedProjects"),
      ]);
      setActiveEntry(active);
      setProjects(projs || []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is needed for clock in/out.");
        return null;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000 });
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      } catch {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {
      Alert.alert("GPS Error", "Unable to get location. Please ensure GPS is enabled.");
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!selectedProject && projects.length > 0) {
      Alert.alert("Select Project", "Please select a project before clocking in.");
      return;
    }
    setClockingIn(true);
    const loc = await getLocation();
    if (!loc) { setClockingIn(false); return; }
    try {
      const result = await apiClient.post("time.clockIn", {
        projectId: selectedProject || projects[0]?.id,
        latitude: loc.lat,
        longitude: loc.lng,
      });
      if (result.ok) { await fetchData(); }
      else { Alert.alert("Error", result.error || "Failed to clock in"); }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to clock in");
    } finally { setClockingIn(false); }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    const loc = await getLocation();
    if (!loc) { setClockingOut(false); return; }
    try {
      const result = await apiClient.post("time.clockOut", { latitude: loc.lat, longitude: loc.lng });
      if (result.ok) { setActiveEntry(null); await fetchData(); }
      else { Alert.alert("Error", result.error || "Failed to clock out"); }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to clock out");
    } finally { setClockingOut(false); }
  };

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const isClockedIn = !!activeEntry;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}>
      <View style={[styles.statusCard, isClockedIn ? styles.statusActive : styles.statusInactive]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, isClockedIn ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.statusText}>{isClockedIn ? "Clocked In" : "Not Clocked In"}</Text>
        </View>
        {isClockedIn && activeEntry && (
          <View style={styles.activeInfo}>
            <Text style={styles.activeProject}>{activeEntry.projectName || "Project"}</Text>
            <Text style={styles.activeTime}>Since {new Date(activeEntry.clockIn || activeEntry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        )}
      </View>

      {!isClockedIn && projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Project</Text>
          {projects.map((project: any) => (
            <TouchableOpacity key={project.id} style={[styles.projectItem, selectedProject === project.id && styles.projectSelected]} onPress={() => setSelectedProject(project.id)}>
              <Ionicons name={selectedProject === project.id ? "radio-button-on" : "radio-button-off"} size={20} color={selectedProject === project.id ? "#3B82F6" : "#5A6A80"} />
              <Text style={styles.projectName}>{project.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.buttonSection}>
        {isClockedIn ? (
          <TouchableOpacity style={[styles.clockButton, styles.clockOutButton]} onPress={handleClockOut} disabled={clockingOut}>
            {clockingOut ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="stop-circle-outline" size={24} color="#FFFFFF" /><Text style={styles.clockButtonText}>Clock Out</Text></>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.clockButton, styles.clockInButton]} onPress={handleClockIn} disabled={clockingIn}>
            {clockingIn ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="play-circle-outline" size={24} color="#FFFFFF" /><Text style={styles.clockButtonText}>Clock In</Text></>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  statusCard: { margin: 16, borderRadius: 12, padding: 20, borderWidth: 1 },
  statusActive: { backgroundColor: "#052E16", borderColor: "#166534" },
  statusInactive: { backgroundColor: "#0F1D32", borderColor: "#1A2A40" },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: "#10B981" },
  dotInactive: { backgroundColor: "#5A6A80" },
  statusText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  activeInfo: { marginTop: 12 },
  activeProject: { color: "#10B981", fontSize: 14, fontWeight: "500" },
  activeTime: { color: "#8892A4", fontSize: 12, marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", marginBottom: 10 },
  projectItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#0F1D32", borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: "#1A2A40" },
  projectSelected: { borderColor: "#3B82F6" },
  projectName: { color: "#E2E8F0", fontSize: 14 },
  buttonSection: { paddingHorizontal: 16, paddingVertical: 20 },
  clockButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 12 },
  clockInButton: { backgroundColor: "#10B981" },
  clockOutButton: { backgroundColor: "#EF4444" },
  clockButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});
