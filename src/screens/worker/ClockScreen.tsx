import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiClient, getStoredToken } from "@/services/api";
import { addToSyncQueue } from "@/services/offlineSync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface Project {
  id: number;
  name: string;
  address?: string;
  status: string;
}

interface ActiveEntry {
  id: number;
  projectId: number;
  clockIn: string;
  notes?: string;
}

interface GeofenceResult {
  valid: boolean;
  message: string;
  distance?: number;
  radius?: number;
  hasGeofence: boolean;
}

export default function ClockScreen() {
  const { isOnline } = useNetworkStatus();
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [refreshing, setRefreshing] = useState(false);

  // Timer for elapsed time
  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => {
      const clockIn = new Date(activeEntry.clockIn).getTime();
      const now = Date.now();
      const diff = now - clockIn;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Get location permission and current position
  const getLocation = useCallback(async () => {
    try {
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Clock in requires GPS.");
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);
      return loc;
    } catch (err) {
      setLocationError("Unable to get location. Please enable GPS.");
      return null;
    }
  }, []);

  // Load active entry and projects
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get active time entry
      const activeRes = await apiClient("/api/trpc/time.getActive", "GET");
      if (activeRes?.result?.data) {
        setActiveEntry(activeRes.result.data);
      } else {
        setActiveEntry(null);
      }

      // Get assigned projects (active ones)
      const projectsRes = await apiClient("/api/trpc/project.getActive", "GET");
      if (projectsRes?.result?.data) {
        setProjects(projectsRes.result.data);
      }
    } catch (err) {
      console.error("Failed to load clock data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await getLocation();
    setRefreshing(false);
  };

  // Validate geofence for selected project
  const validateGeofence = async (projectId: number, loc: Location.LocationObject): Promise<GeofenceResult | null> => {
    try {
      const input = JSON.stringify({
        projectId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const res = await apiClient(
        `/api/trpc/time.validateGeofence?input=${encodeURIComponent(input)}`,
        "GET"
      );
      if (res?.result?.data) {
        setGeofenceStatus(res.result.data);
        return res.result.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Clock In
  const handleClockIn = async () => {
    if (!selectedProject) {
      Alert.alert("Select Project", "Please select a project before clocking in.");
      return;
    }

    setClockingIn(true);
    try {
      const loc = await getLocation();

      if (!loc && isOnline) {
        Alert.alert("Location Required", "Unable to get GPS location. Please enable location services.");
        setClockingIn(false);
        return;
      }

      // Validate geofence if online
      if (isOnline && loc) {
        const geoResult = await validateGeofence(selectedProject.id, loc);
        if (geoResult && !geoResult.valid) {
          Alert.alert("Outside Geofence", geoResult.message);
          setClockingIn(false);
          return;
        }
      }

      const payload = {
        projectId: selectedProject.id,
        latitude: loc?.coords.latitude.toString(),
        longitude: loc?.coords.longitude.toString(),
        accuracy: loc?.coords.accuracy?.toString(),
        withinGeofence: geofenceStatus?.valid ?? true,
      };

      if (isOnline) {
        const res = await apiClient("/api/trpc/time.clockIn", "POST", payload);
        if (res?.result?.data?.success) {
          await loadData();
        } else {
          const errorMsg = res?.error?.message || "Failed to clock in";
          Alert.alert("Error", errorMsg);
        }
      } else {
        // Offline: queue the clock-in
        await addToSyncQueue({
          endpoint: "/api/trpc/time.clockIn",
          method: "POST",
          payload,
          maxRetries: 5,
          priority: 1,
        });
        // Store local active entry for UI
        setActiveEntry({
          id: -1,
          projectId: selectedProject.id,
          clockIn: new Date().toISOString(),
        });
        Alert.alert("Queued", "Clock-in saved offline. Will sync when connected.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      const loc = await getLocation();

      const payload = {
        latitude: loc?.coords.latitude.toString(),
        longitude: loc?.coords.longitude.toString(),
        accuracy: loc?.coords.accuracy?.toString(),
        withinGeofence: true,
      };

      if (isOnline) {
        const res = await apiClient("/api/trpc/time.clockOut", "POST", payload);
        if (res?.result?.data?.success) {
          Alert.alert(
            "Clocked Out",
            `Total hours: ${res.result.data.totalHours}h`
          );
          setActiveEntry(null);
          setElapsedTime("00:00:00");
        } else {
          const errorMsg = res?.error?.message || "Failed to clock out";
          Alert.alert("Error", errorMsg);
        }
      } else {
        await addToSyncQueue({
          endpoint: "/api/trpc/time.clockOut",
          method: "POST",
          payload,
          maxRetries: 5,
          priority: 1,
        });
        setActiveEntry(null);
        setElapsedTime("00:00:00");
        Alert.alert("Queued", "Clock-out saved offline. Will sync when connected.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Connection Status */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.offlineText}>Offline — actions will sync when connected</Text>
        </View>
      )}

      {/* Active Clock Status */}
      {activeEntry ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={styles.pulseContainer}>
              <View style={styles.pulseDot} />
            </View>
            <Text style={styles.activeLabel}>CLOCKED IN</Text>
          </View>
          <Text style={styles.timer}>{elapsedTime}</Text>
          <Text style={styles.projectName}>
            {projects.find((p) => p.id === activeEntry.projectId)?.name || "Project"}
          </Text>
          <Text style={styles.clockInTime}>
            Since {new Date(activeEntry.clockIn).toLocaleTimeString()}
          </Text>

          <TouchableOpacity
            style={[styles.clockButton, styles.clockOutButton]}
            onPress={handleClockOut}
            disabled={clockingOut}
          >
            {clockingOut ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={24} color="#FFF" />
                <Text style={styles.clockButtonText}>CLOCK OUT</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Project Selection */}
          <Text style={styles.sectionTitle}>Select Job Site</Text>
          {projects.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No active projects assigned</Text>
              <Text style={styles.emptySubtext}>
                Contact your supervisor to be assigned to a project
              </Text>
            </View>
          ) : (
            <View style={styles.projectList}>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectCard,
                    selectedProject?.id === project.id && styles.projectCardSelected,
                  ]}
                  onPress={() => setSelectedProject(project)}
                >
                  <View style={styles.projectInfo}>
                    <Text
                      style={[
                        styles.projectCardName,
                        selectedProject?.id === project.id && styles.projectCardNameSelected,
                      ]}
                    >
                      {project.name}
                    </Text>
                    {project.address && (
                      <Text style={styles.projectAddress}>{project.address}</Text>
                    )}
                  </View>
                  {selectedProject?.id === project.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Location Status */}
          <View style={styles.locationCard}>
            <Ionicons
              name={locationError ? "location-outline" : "location"}
              size={20}
              color={locationError ? "#EF4444" : "#22C55E"}
            />
            <Text
              style={[
                styles.locationText,
                locationError && styles.locationErrorText,
              ]}
            >
              {locationError || "GPS active"}
            </Text>
          </View>

          {/* Geofence Status */}
          {geofenceStatus && (
            <View
              style={[
                styles.geofenceCard,
                geofenceStatus.valid ? styles.geofenceValid : styles.geofenceInvalid,
              ]}
            >
              <Ionicons
                name={geofenceStatus.valid ? "shield-checkmark" : "shield-outline"}
                size={20}
                color={geofenceStatus.valid ? "#22C55E" : "#EF4444"}
              />
              <Text style={styles.geofenceText}>{geofenceStatus.message}</Text>
            </View>
          )}

          {/* Clock In Button */}
          <TouchableOpacity
            style={[
              styles.clockButton,
              styles.clockInButton,
              (!selectedProject || clockingIn) && styles.clockButtonDisabled,
            ]}
            onPress={handleClockIn}
            disabled={!selectedProject || clockingIn}
          >
            {clockingIn ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#FFF" />
                <Text style={styles.clockButtonText}>CLOCK IN</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  activeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#22C55E",
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 1,
  },
  timer: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  clockInTime: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  projectList: {
    gap: 8,
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  projectCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  projectInfo: {
    flex: 1,
  },
  projectCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  projectCardNameSelected: {
    color: "#2563EB",
  },
  projectAddress: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "500",
  },
  locationErrorText: {
    color: "#EF4444",
  },
  geofenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  geofenceValid: {
    backgroundColor: "#F0FDF4",
  },
  geofenceInvalid: {
    backgroundColor: "#FEF2F2",
  },
  geofenceText: {
    fontSize: 13,
    color: "#334155",
    flex: 1,
  },
  clockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 16,
  },
  clockInButton: {
    backgroundColor: "#2563EB",
  },
  clockOutButton: {
    backgroundColor: "#EF4444",
  },
  clockButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  clockButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
