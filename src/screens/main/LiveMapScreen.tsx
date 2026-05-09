import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import { apiClient } from "@/services/api";

import { useLanguageStore } from "@/store/languageStore";
// =============================================================================
// TYPES
// =============================================================================

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

interface ActiveEntry {
  id: number;
  userId?: number;
  projectId?: number;
  user?: { id: number; name: string };
  project?: { id: number; name: string };
  entry?: { projectId?: number; userId?: number };
}

interface Project {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  status: string;
}

interface TenantInfo {
  state: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
}

// =============================================================================
// US STATE CENTER COORDINATES
// =============================================================================

const STATE_CENTERS: Record<string, { latitude: number; longitude: number; latDelta: number; lngDelta: number }> = {
  AL: { latitude: 32.806671, longitude: -86.791130, latDelta: 3.5, lngDelta: 3.0 },
  AK: { latitude: 61.370716, longitude: -152.404419, latDelta: 15, lngDelta: 20 },
  AZ: { latitude: 33.729759, longitude: -111.431221, latDelta: 5, lngDelta: 5 },
  AR: { latitude: 34.969704, longitude: -92.373123, latDelta: 3.5, lngDelta: 3.5 },
  CA: { latitude: 36.116203, longitude: -119.681564, latDelta: 8, lngDelta: 6 },
  CO: { latitude: 39.059811, longitude: -105.311104, latDelta: 4, lngDelta: 5 },
  CT: { latitude: 41.235, longitude: -73.087, latDelta: 0.8, lngDelta: 1.0 },
  DE: { latitude: 38.852604, longitude: -75.373946, latDelta: 1.5, lngDelta: 1.0 },
  FL: { latitude: 27.766279, longitude: -81.686783, latDelta: 6, lngDelta: 5 },
  GA: { latitude: 33.040619, longitude: -83.643074, latDelta: 4, lngDelta: 3.5 },
  HI: { latitude: 21.094318, longitude: -157.498337, latDelta: 4, lngDelta: 4 },
  ID: { latitude: 44.240459, longitude: -114.478773, latDelta: 5, lngDelta: 5 },
  IL: { latitude: 40.349457, longitude: -88.986137, latDelta: 5, lngDelta: 3.5 },
  IN: { latitude: 39.849426, longitude: -86.258278, latDelta: 3.5, lngDelta: 3 },
  IA: { latitude: 42.011539, longitude: -93.210526, latDelta: 3.5, lngDelta: 4 },
  KS: { latitude: 38.526600, longitude: -96.726486, latDelta: 3.5, lngDelta: 5 },
  KY: { latitude: 37.668140, longitude: -84.670067, latDelta: 3, lngDelta: 4.5 },
  LA: { latitude: 31.169546, longitude: -91.867805, latDelta: 3.5, lngDelta: 3.5 },
  ME: { latitude: 44.693947, longitude: -69.381927, latDelta: 3.5, lngDelta: 3 },
  MD: { latitude: 39.063946, longitude: -76.802101, latDelta: 2, lngDelta: 3 },
  MA: { latitude: 42.230171, longitude: -71.530106, latDelta: 1.5, lngDelta: 2 },
  MI: { latitude: 43.326618, longitude: -84.536095, latDelta: 5, lngDelta: 5 },
  MN: { latitude: 45.694454, longitude: -93.900192, latDelta: 5, lngDelta: 5 },
  MS: { latitude: 32.741646, longitude: -89.678696, latDelta: 4, lngDelta: 3 },
  MO: { latitude: 38.456085, longitude: -92.288368, latDelta: 4, lngDelta: 4.5 },
  MT: { latitude: 46.921925, longitude: -110.454353, latDelta: 5, lngDelta: 8 },
  NE: { latitude: 41.125370, longitude: -98.268082, latDelta: 3.5, lngDelta: 5 },
  NV: { latitude: 38.313515, longitude: -117.055374, latDelta: 5, lngDelta: 5 },
  NH: { latitude: 43.452492, longitude: -71.563896, latDelta: 2, lngDelta: 1.5 },
  NJ: { latitude: 40.298904, longitude: -74.521011, latDelta: 1.5, lngDelta: 1.5 },
  NM: { latitude: 34.840515, longitude: -106.248482, latDelta: 5, lngDelta: 5 },
  NY: { latitude: 42.165726, longitude: -74.948051, latDelta: 4, lngDelta: 5 },
  NC: { latitude: 35.630066, longitude: -79.806419, latDelta: 3, lngDelta: 5 },
  ND: { latitude: 47.528912, longitude: -99.784012, latDelta: 3.5, lngDelta: 5 },
  OH: { latitude: 40.388783, longitude: -82.764915, latDelta: 3.5, lngDelta: 3.5 },
  OK: { latitude: 35.565342, longitude: -96.928917, latDelta: 3.5, lngDelta: 5 },
  OR: { latitude: 44.572021, longitude: -122.070938, latDelta: 4, lngDelta: 5 },
  PA: { latitude: 40.590752, longitude: -77.209755, latDelta: 3, lngDelta: 4.5 },
  RI: { latitude: 41.680893, longitude: -71.511780, latDelta: 0.7, lngDelta: 0.7 },
  SC: { latitude: 33.856892, longitude: -80.945007, latDelta: 2.5, lngDelta: 3.5 },
  SD: { latitude: 44.299782, longitude: -99.438828, latDelta: 3.5, lngDelta: 5 },
  TN: { latitude: 35.747845, longitude: -86.692345, latDelta: 2.5, lngDelta: 5 },
  TX: { latitude: 31.054487, longitude: -97.563461, latDelta: 8, lngDelta: 10 },
  UT: { latitude: 40.150032, longitude: -111.862434, latDelta: 4.5, lngDelta: 4.5 },
  VT: { latitude: 44.045876, longitude: -72.710686, latDelta: 2, lngDelta: 1.5 },
  VA: { latitude: 37.769337, longitude: -78.169968, latDelta: 3, lngDelta: 5 },
  WA: { latitude: 47.400902, longitude: -121.490494, latDelta: 4, lngDelta: 5 },
  WV: { latitude: 38.491226, longitude: -80.954453, latDelta: 2.5, lngDelta: 3 },
  WI: { latitude: 44.268543, longitude: -89.616508, latDelta: 4, lngDelta: 4 },
  WY: { latitude: 42.755966, longitude: -107.302490, latDelta: 4, lngDelta: 5 },
};

// =============================================================================
// CUSTOM MARKER COMPONENTS
// =============================================================================

/** Building icon marker - dark (empty project) or green (active project) */
function BuildingMarker({ active }: { active: boolean }) {
  return (
    <View style={[markerStyles.buildingWrap, active ? markerStyles.buildingActive : markerStyles.buildingEmpty]}>
      <Ionicons
        name="business"
        size={16}
        color={active ? "#FFFFFF" : "#94A3B8"}
      />
    </View>
  );
}

/** Person icon marker - green (in geofence / active) */
function WorkerMarker() {
  return (
    <View style={markerStyles.workerWrap}>
      <Ionicons name="person" size={14} color="#FFFFFF" />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  buildingWrap: {
    width: 30, height: 30, borderRadius: 6,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  buildingActive: {
    backgroundColor: "#065F46",
    borderWidth: 2, borderColor: "#10B981",
  },
  buildingEmpty: {
    backgroundColor: "#1E293B",
    borderWidth: 1, borderColor: "#334155",
  },
  workerWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#10B981",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
});

// =============================================================================
// COMPONENT
// =============================================================================

export default function LiveMapScreen() {
  const { t } = useLanguageStore();
  const [workers, setWorkers] = useState<WorkerLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectIds, setActiveProjectIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [tenantRegion, setTenantRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("Just now");
  const mapRef = useRef<MapView>(null);

  const fetchData = useCallback(async () => {
    try {
      const [workerLocs, projectList, activeEntries, tenantInfo] = await Promise.all([
        apiClient.get<WorkerLocation[]>("location.getActiveLocations").catch(() => []),
        apiClient.get<Project[]>("projects.list").catch(() => []),
        apiClient.get<any[]>("time.getAllActive").catch(() => []),
        apiClient.get<TenantInfo>("tenants.getCurrent").catch(() => null),
      ]);

      setWorkers(workerLocs || []);
      setProjects((projectList || []).filter((p) => p.latitude && p.longitude));

      // Determine which projects have active workers
      const activeIds = new Set<number>();
      if (activeEntries && Array.isArray(activeEntries)) {
        activeEntries.forEach((item: any) => {
          const entry = item.entry || item;
          const projId = entry.projectId || item.projectId || item.project?.id;
          if (projId) activeIds.add(projId);
        });
      }
      setActiveProjectIds(activeIds);
      setLastUpdate(t("common.justNow"));

      // Set initial map region based on tenant location
      if (tenantInfo && !tenantRegion) {
        if (tenantInfo.latitude && tenantInfo.longitude) {
          setTenantRegion({
            latitude: parseFloat(tenantInfo.latitude),
            longitude: parseFloat(tenantInfo.longitude),
            latitudeDelta: 1.0,
            longitudeDelta: 1.0,
          });
        } else if (tenantInfo.state) {
          const stateCode = tenantInfo.state.toUpperCase().trim();
          const stateCenter = STATE_CENTERS[stateCode];
          if (stateCenter) {
            setTenantRegion({
              latitude: stateCenter.latitude,
              longitude: stateCenter.longitude,
              latitudeDelta: stateCenter.latDelta,
              longitudeDelta: stateCenter.lngDelta,
            });
          }
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fit map to markers on initial load
  useEffect(() => {
    if (!mapRef.current || !tenantRegion) return;

    const coords: { latitude: number; longitude: number }[] = [];
    if (showProjects) {
      projects.forEach((p) => {
        if (p.latitude && p.longitude) {
          coords.push({ latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) });
        }
      });
    }
    if (showWorkers) {
      workers.forEach((w) => {
        coords.push({ latitude: parseFloat(w.location.latitude), longitude: parseFloat(w.location.longitude) });
      });
    }

    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    }
  }, [projects, workers, tenantRegion]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const initialRegion = tenantRegion || {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  const activeWorkerCount = workers.length;

  return (
    <View style={styles.container}>
      {/* Top bar with active count and last update */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.activeDot} />
          <Text style={styles.activeCount}>{activeWorkerCount} active workers</Text>
        </View>
        <Text style={styles.updatedText}>Updated {lastUpdate}</Text>
      </View>

      {/* Native Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        userInterfaceStyle="light"
      >
        {/* Worker Markers - green person icon */}
        {showWorkers && workers.map((w) => (
          <Marker
            key={`worker-${w.location.id}`}
            coordinate={{
              latitude: parseFloat(w.location.latitude),
              longitude: parseFloat(w.location.longitude),
            }}
            title={w.user.name}
            description={`Last update: ${new Date(w.location.timestamp).toLocaleTimeString()}`}
          >
            <WorkerMarker />
          </Marker>
        ))}

        {/* Project Markers - building icons */}
        {showProjects && projects.map((p) => {
          const hasActiveWorkers = activeProjectIds.has(p.id);
          return (
            <Marker
              key={`project-${p.id}`}
              coordinate={{
                latitude: parseFloat(p.latitude!),
                longitude: parseFloat(p.longitude!),
              }}
              title={p.name}
              description={
                hasActiveWorkers
                  ? `Active • ${p.address || ""}`
                  : p.address || p.status
              }
            >
              <BuildingMarker active={hasActiveWorkers} />
            </Marker>
          );
        })}
      </MapView>

      {/* Floating action buttons */}
      <View style={styles.fabColumn}>
        <TouchableOpacity style={styles.fab} onPress={fetchData}>
          <Ionicons name="refresh" size={20} color="#E2E8F0" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (mapRef.current && tenantRegion) {
              mapRef.current.animateToRegion(tenantRegion, 500);
            }
          }}
        >
          <Ionicons name="scan" size={20} color="#E2E8F0" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabGreen]} onPress={() => setShowWorkers(!showWorkers)}>
          <Ionicons name="radio" size={20} color={showWorkers ? "#10B981" : "#5A6A80"} />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>In geofence</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Outside</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>No fence</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIconWrap, { backgroundColor: "#065F46", borderColor: "#10B981" }]}>
            <Ionicons name="business" size={8} color="#FFFFFF" />
          </View>
          <Text style={styles.legendText}>Active</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIconWrap, { backgroundColor: "#1E293B", borderColor: "#334155" }]}>
            <Ionicons name="business" size={8} color="#94A3B8" />
          </View>
          <Text style={styles.legendText}>Empty</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Top bar
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#0F1D32", borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  activeCount: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  updatedText: { color: "#5A6A80", fontSize: 11 },

  // Map
  map: { flex: 1 },

  // Floating action buttons
  fabColumn: {
    position: "absolute", right: 12, bottom: 70,
    gap: 10,
  },
  fab: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#334155",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  fabGreen: { borderColor: "#10B981" },

  // Legend
  legend: {
    position: "absolute", bottom: 16, left: 12, right: 12,
    flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(15, 29, 50, 0.92)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendIconWrap: {
    width: 16, height: 16, borderRadius: 3,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1,
  },
  legendText: { color: "#E2E8F0", fontSize: 10 },
});
