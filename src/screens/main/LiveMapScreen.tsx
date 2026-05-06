import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { apiClient } from "@/services/api";

const { width, height } = Dimensions.get("window");

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
  const webViewRef = useRef<WebView>(null);

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

  const generateMapHTML = () => {
    const workerMarkers = showWorkers ? workers.map((w) => ({
      lat: parseFloat(w.location.latitude),
      lng: parseFloat(w.location.longitude),
      name: w.user.name,
      type: "worker",
    })) : [];

    const projectMarkers = showProjects ? projects
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        lat: parseFloat(p.latitude!),
        lng: parseFloat(p.longitude!),
        name: p.name,
        type: "project",
        status: p.status,
      })) : [];

    // Calculate center from all markers
    const allMarkers = [...workerMarkers, ...projectMarkers];
    let centerLat = 40.7128;
    let centerLng = -74.0060;
    if (allMarkers.length > 0) {
      centerLat = allMarkers.reduce((s, m) => s + m.lat, 0) / allMarkers.length;
      centerLng = allMarkers.reduce((s, m) => s + m.lng, 0) / allMarkers.length;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .legend {
      position: absolute; bottom: 16px; left: 16px; right: 16px;
      background: rgba(15, 29, 50, 0.95); border-radius: 10px; padding: 12px 16px;
      display: flex; gap: 16px; align-items: center; z-index: 1000;
      border: 1px solid #1A2A40;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 12px; font-family: -apple-system, sans-serif; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
    .worker-dot { background: #10B981; }
    .project-dot { background: #3B82F6; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot worker-dot"></div>Workers (${workerMarkers.length})</div>
    <div class="legend-item"><div class="legend-dot project-dot"></div>Projects (${projectMarkers.length})</div>
  </div>
  <script>
    function initMap() {
      const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${centerLat}, lng: ${centerLng} },
        zoom: 10,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0A1628' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1628' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8892A4' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A2A40' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0F1D32' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F1D32' }] },
          { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0F1D32' }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
      });

      const bounds = new google.maps.LatLngBounds();
      let hasMarkers = false;

      // Worker markers (green circles)
      ${JSON.stringify(workerMarkers)}.forEach(function(w) {
        const marker = new google.maps.Marker({
          position: { lat: w.lat, lng: w.lng },
          map: map,
          title: w.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#10B981',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        const infoWindow = new google.maps.InfoWindow({ content: '<div style="color:#000;font-weight:600;padding:4px;">' + w.name + '</div>' });
        marker.addListener('click', function() { infoWindow.open(map, marker); });
        bounds.extend(marker.getPosition());
        hasMarkers = true;
      });

      // Project markers (blue squares)
      ${JSON.stringify(projectMarkers)}.forEach(function(p) {
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: map,
          title: p.name,
          icon: {
            path: 'M -6,-6 6,-6 6,6 -6,6 z',
            scale: 1,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });
        const infoWindow = new google.maps.InfoWindow({ content: '<div style="color:#000;font-weight:600;padding:4px;">' + p.name + '</div>' });
        marker.addListener('click', function() { infoWindow.open(map, marker); });
        bounds.extend(marker.getPosition());
        hasMarkers = true;
      });

      if (hasMarkers) {
        map.fitBounds(bounds, { top: 50, bottom: 80, left: 30, right: 30 });
      }
    }
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?callback=initMap"></script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

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

      {/* Map WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        )}
      />

      {/* Worker count overlay */}
      {workers.length > 0 && (
        <View style={styles.workerCountBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.workerCountText}>{workers.length} active</Text>
        </View>
      )}
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
  mapLoading: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628",
  },
  mapLoadingText: { color: "#8892A4", fontSize: 13, marginTop: 8 },

  // Worker count badge
  workerCountBadge: {
    position: "absolute", top: 60, right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(15, 29, 50, 0.9)", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: "#1A2A40",
  },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  workerCountText: { color: "#10B981", fontSize: 12, fontWeight: "600" },
});
