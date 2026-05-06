import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from "react-native-maps";
import { apiClient } from "@/services/api";

interface WorkerLocation {
  location: {
    id: number;
    userId: number;
    latitude: string;
    longitude: string;
    accuracy: string | null;
    timestamp: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Project {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  status: string;
}

export default function LiveMapScreen() {
  const [workers, setWorkers] = useState<WorkerLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const mapRef = useRef<MapView>(null);

  const fetchData = useCallback(async () => {
    try {
      const [workerLocs, projectList] = await Promise.all([
        apiClient.get<WorkerLocation[]>("location.getActiveLocations").catch(() => []),
        apiClient.get<Project[]>("projects.list").catch(() => []),
      ]);
      setWorkers(workerLocs || []);
      setProjects((projectList || []).filter((p) => p.latitude && p.longitude));
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fit map to all markers
  useEffect(() => {
    if (!mapRef.current) return;
    const coords: { latitude: number; longitude: number }[] = [];

    if (showWorkers) {
      workers.forEach((w) => {
        coords.push({
          latitude: parseFloat(w.location.latitude),
          longitude: parseFloat(w.location.longitude),
        });
      });
    }
    if (showProjects) {
      projects.forEach((p) => {
        if (p.latitude && p.longitude) {
          coords.push({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
          });
        }
      });
    }

    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    }
  }, [workers, projects, showWorkers, showProjects]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Default region (US center) if no markers
  const defaultRegion = {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, showWorkers && styles.filterBtnActive]}
          onPress={() => setShowWorkers(!showWorkers)}
        >
          <Ionicons name="people" size={14} color={showWorkers ? "#10B981" : "#5A6A80"} />
          <Text style={[styles.filterText, showWorkers && styles.filterTextActive]}>
            Workers ({workers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, showProjects && styles.filterBtnActive]}
          onPress={() => setShowProjects(!showProjects)}
        >
          <Ionicons name="folder-open" size={14} color={showProjects ? "#3B82F6" : "#5A6A80"} />
          <Text style={[styles.filterText, showProjects && styles.filterTextActive]}>
            Projects ({projects.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Ionicons name="refresh" size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Native Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        userInterfaceStyle="dark"
      >
        {/* Worker Markers */}
        {showWorkers && workers.map((w) => (
          <Marker
            key={`worker-${w.location.id}`}
            coordinate={{
              latitude: parseFloat(w.location.latitude),
              longitude: parseFloat(w.location.longitude),
            }}
            pinColor="#10B981"
            title={w.user.name}
            description={`Last update: ${new Date(w.location.timestamp).toLocaleTimeString()}`}
          />
        ))}

        {/* Project Markers */}
        {showProjects && projects.map((p) => (
          <Marker
            key={`project-${p.id}`}
            coordinate={{
              latitude: parseFloat(p.latitude!),
              longitude: parseFloat(p.longitude!),
            }}
            pinColor="#3B82F6"
            title={p.name}
            description={p.address || p.status}
          />
        ))}
      </MapView>

      {/* Worker count overlay */}
      {workers.length > 0 && (
        <View style={styles.workerCountBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.workerCountText}>{workers.length} active</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>Workers</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>Projects</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Filter Row
  filterRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#0F1D32", borderBottomWidth: 1, borderBottomColor: "#1A2A40",
    gap: 8, alignItems: "center",
  },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: "#1A2A40",
  },
  filterBtnActive: { backgroundColor: "#0F2D1F", borderWidth: 1, borderColor: "#1A2A40" },
  filterText: { color: "#5A6A80", fontSize: 12, fontWeight: "500" },
  filterTextActive: { color: "#E2E8F0" },
  refreshBtn: { marginLeft: "auto", padding: 8 },

  // Map
  map: { flex: 1 },

  // Worker count badge
  workerCountBadge: {
    position: "absolute", top: 60, right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(15, 29, 50, 0.9)", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: "#1A2A40",
  },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  workerCountText: { color: "#10B981", fontSize: 12, fontWeight: "600" },

  // Legend
  legend: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    flexDirection: "row", gap: 16, alignItems: "center",
    backgroundColor: "rgba(15, 29, 50, 0.9)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#E2E8F0", fontSize: 12 },
});
