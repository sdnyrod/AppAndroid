import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert, Dimensions,
  TextInput, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiClient } from "@/services/api";

const { width } = Dimensions.get("window");
const CHIP_WIDTH = (width - 48 - 8) / 2; // 2 columns with gap

// =============================================================================
// TYPES
// =============================================================================

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
  projectName: string;
  clockIn: string;
  elapsed: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getElapsedTime(clockInISO: string): string {
  if (!clockInISO) return "";
  try {
    const clockIn = new Date(clockInISO);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}M`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h${mins > 0 ? `${mins}m` : ""}`;
  } catch {
    return "";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TimeTrackingScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [crewWorking, setCrewWorking] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectList, active, allActive] = await Promise.all([
        apiClient.get<Project[]>("projects.getActive").catch(() => apiClient.get<Project[]>("projects.list")),
        apiClient.get<any>("time.getActive"),
        apiClient.get<any[]>("time.getAllActive").catch(() => []),
      ]);

      // Filter active projects
      const activeProjects = (projectList || []).filter(
        (p: any) => p.status === "active" || !p.status
      );
      setProjects(activeProjects);

      // Current user's active entry
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
      // API returns { entry: {...}, user: {...}, project: {...} }
      if (allActive && Array.isArray(allActive)) {
        const working: CrewMember[] = allActive.map((e: any) => {
          const entry = e.entry || e;
          const user = e.user || {};
          const project = e.project || {};
          const clockIn = entry.clockIn || entry.clockInTime || e.clockIn || "";
          return {
            id: user.id || entry.userId || entry.id || Math.random(),
            name: user.name || e.employeeName || e.userName || "Worker",
            status: "working" as const,
            projectName: project.name || e.projectName || "",
            clockIn,
            elapsed: getElapsedTime(clockIn),
          };
        });
        setCrewWorking(working);
      }
    } catch {
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const isClockedIn = !!activeEntry;

  // Filter projects by search text (inline search)
  const filteredProjects = searchText.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()))
    : projects;

  // Show max 8 project chips (or all filtered results if searching)
  const displayProjects = searchText.trim() ? filteredProjects : filteredProjects.slice(0, 8);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
      }
    >
      {/* ================================================================ */}
      {/* STATUS SECTION (when clocked in) */}
      {/* ================================================================ */}
      {isClockedIn && activeEntry ? (
        <View style={styles.statusSection}>
          <View style={styles.statusBanner}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.statusLabel}>CLOCKED IN</Text>
          </View>
          <Text style={styles.statusProject}>{activeEntry.projectName}</Text>
          <Text style={styles.statusTime}>
            Since {new Date(activeEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" · "}{getElapsedTime(activeEntry.clockIn)}
          </Text>
        </View>
      ) : (
        /* ================================================================ */
        /* PROJECT SELECTION (when NOT clocked in) */
        /* ================================================================ */
        <View style={styles.projectSection}>
          <View style={styles.statusBanner}>
            <View style={styles.statusDotGray} />
            <Text style={styles.statusLabelGray}>NOT CLOCKED IN</Text>
          </View>
          <Text style={styles.selectLabel}>Select a project and tap to start</Text>

          {/* Project chips - 2 columns */}
          <View style={styles.chipGrid}>
            {displayProjects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[
                  styles.chip,
                  selectedProject === project.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedProject(project.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipRadio, selectedProject === project.id && styles.chipRadioSelected]} />
                <Text
                  style={[styles.chipText, selectedProject === project.id && styles.chipTextSelected]}
                  numberOfLines={2}
                >
                  {project.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Search chip (always last) */}
            {!showSearch ? (
              <TouchableOpacity
                style={styles.searchChip}
                onPress={() => setShowSearch(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="search" size={14} color="#3B82F6" />
                <Text style={styles.searchChipText}>Search...</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.searchInputWrap}>
                <Ionicons name="search" size={14} color="#3B82F6" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type to filter..."
                  placeholderTextColor="#5A6A80"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus
                  returnKeyType="done"
                  onBlur={() => { if (!searchText) setShowSearch(false); }}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchText(""); setShowSearch(false); }}>
                    <Ionicons name="close-circle" size={16} color="#5A6A80" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/* LARGE CIRCULAR CLOCK BUTTON */}
      {/* ================================================================ */}
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
                <Ionicons name="stop-circle" size={36} color="#FFFFFF" />
                <Text style={styles.circularButtonText}>CLOCK OUT</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.circularButton, styles.circularButtonIn]}
            onPress={handleClockIn}
            disabled={clockingIn || !selectedProject}
            activeOpacity={0.7}
          >
            {clockingIn ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                <Text style={styles.circularButtonText}>CLOCK IN</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ================================================================ */}
      {/* CREW MANAGEMENT */}
      {/* ================================================================ */}
      <View style={styles.crewSection}>
        <View style={styles.crewHeader}>
          <Ionicons name="people" size={18} color="#FFFFFF" />
          <Text style={styles.crewTitle}>Crew Management</Text>
        </View>

        {/* Working Now */}
        {crewWorking.length > 0 && (
          <>
            <View style={styles.crewSubheader}>
              <View style={styles.crewLiveDot} />
              <Text style={styles.crewSubtitleGreen}>WORKING NOW ({crewWorking.length})</Text>
            </View>
            {crewWorking.map((member) => (
              <View key={member.id} style={styles.crewCard}>
                <View style={[styles.crewAvatar, styles.crewAvatarActive]}>
                  <Text style={styles.crewInitial}>{(member.name || "W").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.crewInfo}>
                  <Text style={styles.crewName}>{member.name}</Text>
                  <Text style={styles.crewProject}>{member.projectName}  {member.elapsed}</Text>
                </View>
                <TouchableOpacity style={styles.clockOutBadge}>
                  <Ionicons name="stop" size={10} color="#FFFFFF" />
                  <Text style={styles.clockOutBadgeText}>Out</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* No active workers */}
        {crewWorking.length === 0 && (
          <View style={styles.emptyCrewCard}>
            <Ionicons name="people-outline" size={20} color="#5A6A80" />
            <Text style={styles.emptyCrewText}>No workers currently clocked in</Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Status Section (clocked in)
  statusSection: { paddingHorizontal: 16, paddingTop: 12 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  statusDotGray: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5A6A80" },
  statusLabel: { color: "#10B981", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statusLabelGray: { color: "#8892A4", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statusProject: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginTop: 4 },
  statusTime: { color: "#86EFAC", fontSize: 12, marginTop: 2 },

  // Project Selection Section
  projectSection: { paddingHorizontal: 16, paddingTop: 12 },
  selectLabel: { color: "#8892A4", fontSize: 13, marginBottom: 12, marginTop: 4 },

  // Chip Grid (2 columns)
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: CHIP_WIDTH,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: "#0F1D32", borderRadius: 20,
    borderWidth: 1, borderColor: "#1A2A40",
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  chipSelected: { borderColor: "#3B82F6", backgroundColor: "#0F1D42" },
  chipRadio: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: "#5A6A80",
  },
  chipRadioSelected: { borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  chipText: { color: "#C8D0DC", fontSize: 12, flex: 1 },
  chipTextSelected: { color: "#FFFFFF", fontWeight: "600" },

  // Search chip
  searchChip: {
    width: CHIP_WIDTH,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: "transparent", borderRadius: 20,
    borderWidth: 1, borderColor: "#3B82F6",
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center",
  },
  searchChipText: { color: "#3B82F6", fontSize: 12, fontWeight: "500" },
  searchInputWrap: {
    width: CHIP_WIDTH,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: "#0F1D32", borderRadius: 20,
    borderWidth: 1, borderColor: "#3B82F6",
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 12, paddingVertical: 4 },

  // Circular Clock Button
  clockSection: { alignItems: "center", paddingVertical: 20 },
  circularButton: {
    width: 130, height: 130, borderRadius: 65,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  circularButtonIn: { backgroundColor: "#5EEAD4" },
  circularButtonOut: { backgroundColor: "#EF4444" },
  circularButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginTop: 4, letterSpacing: 1 },

  // Crew Section
  crewSection: { paddingHorizontal: 16, marginTop: 4 },
  crewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  crewTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  crewSubheader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  crewLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  crewSubtitleGreen: { color: "#10B981", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  // Crew Card
  crewCard: {
    flexDirection: "row", alignItems: "center", padding: 10,
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  crewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  crewAvatarActive: { backgroundColor: "#065F46" },
  crewInitial: { color: "#10B981", fontSize: 13, fontWeight: "700" },
  crewInfo: { flex: 1 },
  crewName: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  crewProject: { color: "#8892A4", fontSize: 11, marginTop: 2 },

  // Clock out badge on crew card
  clockOutBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#EF4444", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  clockOutBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },

  // Empty state
  emptyCrewCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0F1D32", borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  emptyCrewText: { color: "#5A6A80", fontSize: 13 },
});
