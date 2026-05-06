import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiClient } from "@/services/api";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

interface Project {
  id: number;
  name: string;
  status: string;
}

interface ActiveEntry {
  id: number;
  projectId: number;
  projectName: string;
  clockIn: string;
  userName?: string;
}

interface CrewMember {
  id: number;
  name: string;
  status: "working" | "not_working";
  projectName?: string;
  clockIn?: string;
}

export default function TimeTrackingScreen() {
  const navigation = useNavigation<any>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectList, active, allActive] = await Promise.all([
        apiClient.get<Project[]>("projects.getActive").catch(() => apiClient.get<Project[]>("projects.list")),
        apiClient.get<any>("time.getActive"),
        apiClient.get<any[]>("time.getAllActive").catch(() => []),
      ]);
      setProjects((projectList || []).filter((p: any) => p.status === "active" || !p.status));
      if (active) {
        setActiveEntry({
          id: active.id,
          projectId: active.projectId,
          projectName: active.project?.name || active.projectName || "Project",
          clockIn: active.clockIn || active.clockInTime || "",
        });
      } else {
        setActiveEntry(null);
      }
      // Build crew list from all active entries
      if (allActive && Array.isArray(allActive)) {
        const working: CrewMember[] = allActive.map((e: any) => ({
          id: e.userId || e.id,
          name: e.employeeName || e.user?.name || "Worker",
          status: "working" as const,
          projectName: e.projectName || e.project?.name || "",
          clockIn: e.clockIn || e.clockInTime || "",
        }));
        setCrewMembers(working);
      }
    } catch (e) {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for clock in/out.");
        return null;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000 });
        return { lat: loc.coords.latitude.toString(), lng: loc.coords.longitude.toString() };
      } catch {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { lat: loc.coords.latitude.toString(), lng: loc.coords.longitude.toString() };
      }
    } catch {
      Alert.alert("GPS Error", "Unable to get location. Please ensure GPS is enabled.");
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!selectedProject) {
      Alert.alert("Select Project", "Please select a project before clocking in.");
      return;
    }
    setClockingIn(true);
    const loc = await getLocation();
    if (!loc) { setClockingIn(false); return; }
    try {
      const result = await apiClient.post("time.clockIn", {
        projectId: selectedProject,
        latitude: loc.lat,
        longitude: loc.lng,
      });
      if (result.ok) {
        await fetchData();
      } else {
        Alert.alert("Error", result.error || "Failed to clock in");
      }
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

  // Show first 5 projects vertically, then 2x2 grid for the rest
  const firstFive = projects.slice(0, 5);
  const remaining = projects.slice(5);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}>

      {/* Status Banner */}
      {isClockedIn && activeEntry && (
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusText}>Clocked In</Text>
            <Text style={styles.statusProject}>{activeEntry.projectName}</Text>
          </View>
          <Text style={styles.statusTime}>
            Since {new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      )}

      {/* Project Pills Section */}
      {!isClockedIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Project</Text>

          {/* First 5 vertical */}
          {firstFive.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={[styles.projectPill, selectedProject === project.id && styles.projectPillSelected]}
              onPress={() => setSelectedProject(project.id)}
            >
              <View style={[styles.pillDot, selectedProject === project.id && styles.pillDotSelected]} />
              <Text style={[styles.pillText, selectedProject === project.id && styles.pillTextSelected]}>
                {project.name}
              </Text>
              {selectedProject === project.id && (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}

          {/* Remaining in 2x2 grid */}
          {remaining.length > 0 && (
            <View style={styles.projectGrid}>
              {remaining.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[styles.projectGridItem, selectedProject === project.id && styles.projectGridItemSelected]}
                  onPress={() => setSelectedProject(project.id)}
                >
                  <Text style={[styles.gridItemText, selectedProject === project.id && styles.gridItemTextSelected]} numberOfLines={2}>
                    {project.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Button */}
          {projects.length > 7 && (
            <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate("Projects")}>
              <Ionicons name="search" size={16} color="#3B82F6" />
              <Text style={styles.searchBtnText}>Search All Projects</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Large Circular Clock Button */}
      <View style={styles.clockSection}>
        {isClockedIn ? (
          <TouchableOpacity
            style={[styles.circularButton, styles.circularButtonOut]}
            onPress={handleClockOut}
            disabled={clockingOut}
            activeOpacity={0.7}
          >
            {clockingOut ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={40} color="#FFFFFF" />
                <Text style={styles.circularButtonText}>CLOCK OUT</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.circularButton, styles.circularButtonIn]}
            onPress={handleClockIn}
            disabled={clockingIn}
            activeOpacity={0.7}
          >
            {clockingIn ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                <Text style={styles.circularButtonText}>CLOCK IN</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Crew Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crew Management</Text>

        {/* Currently Working */}
        {crewMembers.length > 0 && (
          <View style={styles.crewSubsection}>
            <Text style={styles.crewSubtitle}>WORKING ({crewMembers.length})</Text>
            {crewMembers.slice(0, 5).map((member) => (
              <View key={member.id} style={styles.crewCard}>
                <View style={styles.crewAvatar}>
                  <Text style={styles.crewInitial}>{(member.name || "W").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.crewInfo}>
                  <Text style={styles.crewName}>{member.name}</Text>
                  <Text style={styles.crewProject}>{member.projectName}</Text>
                </View>
                <View style={styles.crewStatusWrap}>
                  <View style={styles.crewLiveDot} />
                  <Text style={styles.crewTime}>
                    {member.clockIn ? new Date(member.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Not Working */}
        {crewMembers.length === 0 && (
          <View style={styles.crewSubsection}>
            <Text style={styles.crewSubtitle}>NOT WORKING</Text>
            <View style={styles.emptyCrewCard}>
              <Ionicons name="people-outline" size={20} color="#5A6A80" />
              <Text style={styles.emptyCrewText}>No crew data available</Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Status Banner
  statusBanner: {
    flexDirection: "row", alignItems: "center", margin: 16,
    backgroundColor: "#052E16", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#166534",
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981", marginRight: 12 },
  statusText: { color: "#10B981", fontSize: 14, fontWeight: "700" },
  statusProject: { color: "#86EFAC", fontSize: 12, marginTop: 2 },
  statusTime: { color: "#86EFAC", fontSize: 12, fontWeight: "500" },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 12 },

  // Project Pills
  projectPill: {
    flexDirection: "row", alignItems: "center", padding: 14,
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  projectPillSelected: { borderColor: "#10B981", backgroundColor: "#0F2D1F" },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5A6A80", marginRight: 12 },
  pillDotSelected: { backgroundColor: "#10B981" },
  pillText: { color: "#E2E8F0", fontSize: 14, flex: 1 },
  pillTextSelected: { color: "#10B981", fontWeight: "600" },

  // Project Grid (2x2)
  projectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  projectGridItem: {
    width: (width - 48) / 2, padding: 14,
    backgroundColor: "#0F1D32", borderRadius: 10,
    borderWidth: 1, borderColor: "#1A2A40", justifyContent: "center",
  },
  projectGridItemSelected: { borderColor: "#10B981", backgroundColor: "#0F2D1F" },
  gridItemText: { color: "#E2E8F0", fontSize: 13, textAlign: "center" },
  gridItemTextSelected: { color: "#10B981", fontWeight: "600" },

  // Search Button
  searchBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 12, paddingVertical: 10, gap: 6,
  },
  searchBtnText: { color: "#3B82F6", fontSize: 13, fontWeight: "500" },

  // Circular Clock Button
  clockSection: { alignItems: "center", paddingVertical: 24 },
  circularButton: {
    width: 140, height: 140, borderRadius: 70,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  circularButtonIn: { backgroundColor: "#10B981" },
  circularButtonOut: { backgroundColor: "#EF4444" },
  circularButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: 4, letterSpacing: 1 },

  // Crew Management
  crewSubsection: { marginTop: 8 },
  crewSubtitle: { color: "#8892A4", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  crewCard: {
    flexDirection: "row", alignItems: "center", padding: 12,
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  crewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  crewInitial: { color: "#3B82F6", fontSize: 13, fontWeight: "700" },
  crewInfo: { flex: 1 },
  crewName: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  crewProject: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  crewStatusWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  crewLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  crewTime: { color: "#10B981", fontSize: 11, fontWeight: "500" },
  emptyCrewCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0F1D32", borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  emptyCrewText: { color: "#5A6A80", fontSize: 13 },
});
