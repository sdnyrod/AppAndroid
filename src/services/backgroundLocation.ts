/**
 * Background Location Tracking Service
 * 
 * Monitors the employee's location while clocked-in and detects geofence violations.
 * Uses expo-task-manager + expo-location for background tracking.
 * 
 * Flow:
 * 1. On clock-in → startBackgroundTracking(projectId, geofenceCenter, geofenceRadius)
 * 2. Every ~5 minutes, the OS delivers a location update
 * 3. We calculate distance from geofence center
 * 4. If outside radius → report violation to backend (which sends push to employee + supervisor + owner)
 * 5. On clock-out → stopBackgroundTracking()
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api";

// Task name registered with expo-task-manager
export const BACKGROUND_LOCATION_TASK = "CREW_BACKGROUND_LOCATION_TASK";

// Storage keys
const GEOFENCE_CONFIG_KEY = "crew_geofence_config";
const VIOLATION_COOLDOWN_KEY = "crew_violation_cooldown";

// Cooldown: don't spam notifications — wait 15 minutes between violation alerts
const VIOLATION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

interface GeofenceConfig {
  projectId: number;
  projectName: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  employeeId: number;
  employeeName: string;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Define the background task that processes location updates.
 * This runs even when the app is in the background or killed.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[BackgroundLocation] Task error:", error.message);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const latestLocation = locations[locations.length - 1];
  const { latitude, longitude } = latestLocation.coords;

  try {
    // Get geofence config from storage
    const configStr = await AsyncStorage.getItem(GEOFENCE_CONFIG_KEY);
    if (!configStr) {
      console.log("[BackgroundLocation] No geofence config found, stopping.");
      return;
    }

    const config: GeofenceConfig = JSON.parse(configStr);

    // Calculate distance from geofence center
    const distance = haversineDistance(
      latitude, longitude,
      config.centerLat, config.centerLng
    );

    console.log(
      `[BackgroundLocation] Position: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} | ` +
      `Distance from site: ${distance.toFixed(0)}m | Radius: ${config.radiusMeters}m`
    );

    // Check if outside geofence
    if (distance > config.radiusMeters) {
      // Check cooldown to avoid spamming
      const lastViolationStr = await AsyncStorage.getItem(VIOLATION_COOLDOWN_KEY);
      const lastViolation = lastViolationStr ? parseInt(lastViolationStr, 10) : 0;
      const now = Date.now();

      if (now - lastViolation > VIOLATION_COOLDOWN_MS) {
        // Report violation to backend
        console.log(
          `[BackgroundLocation] GEOFENCE VIOLATION! Distance: ${distance.toFixed(0)}m > ${config.radiusMeters}m`
        );

        await apiClient.post("time.reportGeofenceViolation", {
          projectId: config.projectId,
          latitude,
          longitude,
          distanceMeters: Math.round(distance),
          radiusMeters: config.radiusMeters,
        });

        // Set cooldown
        await AsyncStorage.setItem(VIOLATION_COOLDOWN_KEY, now.toString());
      } else {
        console.log("[BackgroundLocation] Violation detected but in cooldown period.");
      }
    }
  } catch (err) {
    console.error("[BackgroundLocation] Error processing location:", err);
  }
});

/**
 * Start background location tracking when an employee clocks in.
 * Call this after a successful clock-in with the project's geofence data.
 */
export async function startBackgroundTracking(config: GeofenceConfig): Promise<boolean> {
  try {
    // Request background location permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      console.log("[BackgroundLocation] Foreground permission denied");
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      console.log("[BackgroundLocation] Background permission denied");
      // Still allow clock-in, just without background tracking
      return false;
    }

    // Save geofence config for the background task to use
    await AsyncStorage.setItem(GEOFENCE_CONFIG_KEY, JSON.stringify(config));

    // Clear any previous cooldown
    await AsyncStorage.removeItem(VIOLATION_COOLDOWN_KEY);

    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      console.log("[BackgroundLocation] Already running, updating config.");
      return true;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000, // 5 minutes
      distanceInterval: 50, // or when moved 50 meters
      deferredUpdatesInterval: 5 * 60 * 1000,
      showsBackgroundLocationIndicator: true, // iOS: shows blue bar
      foregroundService: {
        notificationTitle: "CREW - Location Active",
        notificationBody: `Tracking for ${config.projectName}`,
        notificationColor: "#3B82F6",
      },
      pausesUpdatesAutomatically: false,
    });

    console.log("[BackgroundLocation] Started background tracking for project:", config.projectName);
    return true;
  } catch (err) {
    console.error("[BackgroundLocation] Error starting tracking:", err);
    return false;
  }
}

/**
 * Stop background location tracking when an employee clocks out.
 */
export async function stopBackgroundTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log("[BackgroundLocation] Stopped background tracking.");
    }

    // Clean up stored config
    await AsyncStorage.removeItem(GEOFENCE_CONFIG_KEY);
    await AsyncStorage.removeItem(VIOLATION_COOLDOWN_KEY);
  } catch (err) {
    console.error("[BackgroundLocation] Error stopping tracking:", err);
  }
}

/**
 * Check if background tracking is currently active.
 */
export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
