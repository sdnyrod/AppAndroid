import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert, Dimensions,
  Modal, Platform, KeyboardAvoidingView, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiClient } from "@/services/api";
import { startBackgroundTracking, stopBackgroundTracking } from "@/services/backgroundLocation";
import SearchableSelect from "@/components/SearchableSelect";
import { useLanguageStore } from "@/store/languageStore";

const { width, height } = Dimensions.get("window");

// =============================================================================
// TYPES
// =============================================================================

interface Project {
  id: number;
  name: string;
  status: string;
  clientName?: string;
}

interface ActiveEntry {
  id: number;
  projectId: number;
  projectName: string;
  clockIn: string;
  userName?: string;
  userId?: number;
}

interface CrewMember {
  id: number;
  name: string;
  status: "working" | "not_working";
  projectName: string;
  clockIn: string;
  elapsed: string;
  entryId?: number;
}

interface Employee {
  id: number;
  name: string;
  role?: string;
  department?: string;
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TimeTrackingScreen() {
  const { t } = useLanguageStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [crewWorking, setCrewWorking] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [clockingOutMemberId, setClockingOutMemberId] = useState<number | null>(null);

  // Supervisor Clock-In Modal
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInEmployee, setClockInEmployee] = useState<number | null>(null);
  const [clockInProject, setClockInProject] = useState<number | null>(null);
  const [clockInSubmitting, setClockInSubmitting] = useState(false);

  // Manual Entry Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEmployee, setManualEmployee] = useState<number | null>(null);
  const [manualProject, setManualProject] = useState<number | null>(null);
  const [manualClockIn, setManualClockIn] = useState(new Date());
  const [manualClockOut, setManualClockOut] = useState(new Date());
  const [manualReason, setManualReason] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [showManualClockInPicker, setShowManualClockInPicker] = useState(false);
  const [showManualClockOutPicker, setShowManualClockOutPicker] = useState(false);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [manualDate, setManualDate] = useState(new Date());

  // =========================================================================
  // DATA FETCHING
  // =========================================================================

  const fetchProjects = useCallback(async (): Promise<Project[]> => {
    const active = await apiClient.get<Project[]>("projects.getActive");
    if (active && active.length > 0) {
      return active.filter((p) => p.status === "active" || !p.status);
    }
    const all = await apiClient.get<Project[]>("projects.list");
    if (all && all.length > 0) {
      return all.filter((p) => p.status === "active" || !p.status);
    }
    return [];
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await apiClient.get<Employee[]>("users.list");
      if (data && Array.isArray(data)) {
        setEmployees(data.filter((e: any) => e.status !== "inactive" && e.status !== "terminated"));
      }
    } catch {
      // Fallback: try getEmployees
      try {
        const data = await apiClient.get<Employee[]>("users.getEmployees");
        if (data && Array.isArray(data)) {
          setEmployees(data);
        }
      } catch { /* silent */ }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [projectList, active, allActive] = await Promise.all([
        fetchProjects(),
        apiClient.get<any>("time.getActive"),
        apiClient.get<any[]>("time.getAllActive"),
      ]);

      setProjects(projectList);

      // Current user's active entry
      if (active) {
        setActiveEntry({
          id: active.id,
          projectId: active.projectId,
          projectName: active.project?.name || active.projectName || t("common.project"),
          clockIn: active.clockIn || active.clockInTime || "",
        });
      } else {
        setActiveEntry(null);
      }

      // Build crew list from all active entries
      if (allActive && Array.isArray(allActive)) {
        const working: CrewMember[] = allActive.map((e: any) => {
          const entry = e.entry || e;
          const user = e.user || {};
          const project = e.project || {};
          const clockIn = entry.clockIn || entry.clockInTime || e.clockIn || "";
          return {
            id: user.id || entry.userId || entry.id || Math.random(),
            name: user.name || e.employeeName || e.userName || t("common.worker"),
            status: "working" as const,
            projectName: project.name || e.projectName || "",
            clockIn,
            elapsed: getElapsedTime(clockIn),
            entryId: entry.id,
          };
        });
        setCrewWorking(working);
      }
    } catch {
      // Network/auth errors handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, [fetchData, fetchEmployees]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchEmployees();
  };

  // =========================================================================
  // ACTIONS — Self Clock In/Out
  // =========================================================================

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.permissionDenied"), "Location permission is required for clock in/out.");
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
      Alert.alert(t("time.gpsError"), "Unable to get location. Please ensure GPS is enabled.");
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!selectedProject) {
      Alert.alert(t("time.selectProject"), "Please select a project before clocking in.");
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
        try {
          const projectData = await apiClient.get<any>("time.getGeofenceConfig", { projectId: selectedProject });
          if (projectData && projectData.hasGeofence) {
            await startBackgroundTracking({
              projectId: selectedProject,
              projectName: selectedProjectName || "Project",
              centerLat: projectData.latitude,
              centerLng: projectData.longitude,
              radiusMeters: projectData.radiusMeters,
              employeeId: projectData.employeeId,
              employeeName: projectData.employeeName,
            });
          }
        } catch (bgErr) {
          console.log("[Clock] Background tracking setup failed (non-blocking):", bgErr);
        }
        await fetchData();
      } else {
        Alert.alert(t("common.error"), result.error || t("time.failedClockIn"));
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || t("time.failedClockIn"));
    } finally { setClockingIn(false); }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    const loc = await getLocation();
    if (!loc) { setClockingOut(false); return; }
    try {
      const result = await apiClient.post("time.clockOut", { latitude: loc.lat, longitude: loc.lng });
      if (result.ok) {
        try { await stopBackgroundTracking(); } catch (e) { console.log("[Clock] Stop tracking error:", e); }
        setActiveEntry(null); await fetchData();
      }
      else { Alert.alert(t("common.error"), result.error || t("time.failedClockOut")); }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || t("time.failedClockOut"));
    } finally { setClockingOut(false); }
  };

  const handleCrewClockOut = (member: CrewMember) => {
    Alert.alert(
      t("time.confirmClockOut"),
      `${t("time.clockOutConfirmMessage")} ${member.name}?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("time.clockOut"),
          style: "destructive",
          onPress: async () => {
            setClockingOutMemberId(member.id);
            const loc = await getLocation();
            try {
              const result = await apiClient.post("time.supervisorClockOut", {
                employeeId: member.id,
                latitude: loc?.lat,
                longitude: loc?.lng,
              });
              if (result.ok) {
                await fetchData();
              } else {
                Alert.alert(t("common.error"), result.error || t("time.failedClockOut"));
              }
            } catch (e: any) {
              Alert.alert(t("common.error"), e?.message || t("time.failedClockOut"));
            } finally {
              setClockingOutMemberId(null);
            }
          },
        },
      ]
    );
  };

  // =========================================================================
  // ACTIONS — Supervisor Clock-In
  // =========================================================================

  const openClockInModal = () => {
    setClockInEmployee(null);
    setClockInProject(null);
    setShowClockInModal(true);
  };

  const handleSupervisorClockIn = async () => {
    if (!clockInEmployee || !clockInProject) {
      Alert.alert(t("common.error"), "Please select an employee and a project.");
      return;
    }
    setClockInSubmitting(true);
    const loc = await getLocation();
    try {
      const result = await apiClient.post("time.supervisorClockIn", {
        employeeId: clockInEmployee,
        projectId: clockInProject,
        latitude: loc?.lat,
        longitude: loc?.lng,
      });
      if (result.ok || result.id) {
        setShowClockInModal(false);
        Alert.alert(t("common.success"), "Employee clocked in successfully.");
        await fetchData();
      } else {
        Alert.alert(t("common.error"), result.error || "Failed to clock in employee.");
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || "Failed to clock in employee.");
    } finally {
      setClockInSubmitting(false);
    }
  };

  // =========================================================================
  // ACTIONS — Manual Entry
  // =========================================================================

  const openManualModal = () => {
    setManualEmployee(null);
    setManualProject(null);
    const now = new Date();
    const start = new Date(now);
    start.setHours(7, 0, 0, 0);
    const end = new Date(now);
    end.setHours(15, 30, 0, 0);
    setManualDate(now);
    setManualClockIn(start);
    setManualClockOut(end);
    setManualReason("");
    setManualNotes("");
    setShowManualModal(true);
  };

  const handleManualEntry = async () => {
    if (!manualEmployee || !manualProject) {
      Alert.alert(t("common.error"), "Please select an employee and a project.");
      return;
    }
    if (!manualReason.trim()) {
      Alert.alert(t("common.error"), "A reason is required for manual entries.");
      return;
    }
    setManualSubmitting(true);
    try {
      // Combine date + time
      const clockIn = new Date(manualDate);
      clockIn.setHours(manualClockIn.getHours(), manualClockIn.getMinutes(), 0, 0);
      const clockOut = new Date(manualDate);
      clockOut.setHours(manualClockOut.getHours(), manualClockOut.getMinutes(), 0, 0);

      if (clockOut <= clockIn) {
        Alert.alert(t("common.error"), "Clock-out must be after clock-in.");
        setManualSubmitting(false);
        return;
      }

      const result = await apiClient.post("time.createManualEntry", {
        employeeId: manualEmployee,
        projectId: manualProject,
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        reason: manualReason.trim(),
        notes: manualNotes.trim() || undefined,
      });
      if (result.ok || result.id) {
        setShowManualModal(false);
        Alert.alert(t("common.success"), "Manual entry created successfully.");
        await fetchData();
      } else {
        Alert.alert(t("common.error"), result.error || "Failed to create manual entry.");
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || "Failed to create manual entry.");
    } finally {
      setManualSubmitting(false);
    }
  };

  // =========================================================================
  // DERIVED STATE
  // =========================================================================

  const isClockedIn = !!activeEntry;

  const activeProjects = useMemo(() =>
    projects.filter((p) => p.status === "active" || !p.status),
    [projects]
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
              <Text style={styles.statusLabel}>{t("time.clockedIn")}</Text>
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
              <Text style={styles.statusLabelGray}>{t("time.notClockedIn")}</Text>
            </View>
            <Text style={styles.selectLabel}>{t("time.selectProjectTap")}</Text>

            <SearchableSelect
              items={projects.map((p) => ({ id: p.id, name: p.name, subtitle: p.clientName }))}
              selectedId={selectedProject}
              onSelect={(item) => { setSelectedProject(item.id); setSelectedProjectName(item.name); }}
              placeholder={t("time.searchProject")}
              icon="business-outline"
              iconColor="#5EEAD4"
            />
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
                  <Text style={styles.circularButtonText}>{t("time.clockOut")}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.circularButton, styles.circularButtonIn, !selectedProject && styles.circularButtonDisabled]}
              onPress={handleClockIn}
              disabled={clockingIn || !selectedProject}
              activeOpacity={0.7}
            >
              {clockingIn ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                  <Text style={styles.circularButtonText}>{t("time.clockIn")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ================================================================ */}
        {/* SUPERVISOR ACTIONS */}
        {/* ================================================================ */}
        <View style={styles.supervisorSection}>
          <View style={styles.supervisorHeader}>
            <Ionicons name="shield-checkmark" size={16} color="#3B82F6" />
            <Text style={styles.supervisorTitle}>Supervisor Actions</Text>
          </View>
          <View style={styles.supervisorButtons}>
            <TouchableOpacity style={styles.supervisorBtn} onPress={openClockInModal} activeOpacity={0.7}>
              <Ionicons name="person-add" size={16} color="#10B981" />
              <Text style={styles.supervisorBtnText}>Clock In Employee</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supervisorBtn} onPress={openManualModal} activeOpacity={0.7}>
              <Ionicons name="create" size={16} color="#F59E0B" />
              <Text style={styles.supervisorBtnText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================================ */}
        {/* CREW MANAGEMENT */}
        {/* ================================================================ */}
        <View style={styles.crewSection}>
          <View style={styles.crewHeader}>
            <Ionicons name="people" size={18} color="#FFFFFF" />
            <Text style={styles.crewTitle}>{t("time.crewManagement")}</Text>
          </View>

          {crewWorking.length > 0 && (
            <>
              <View style={styles.crewSubheader}>
                <View style={styles.crewLiveDot} />
                <Text style={styles.crewSubtitleGreen}>WORKING NOW ({crewWorking.length})</Text>
              </View>
              {crewWorking.map((member) => (
                <View key={`${member.id}-${member.entryId}`} style={styles.crewCard}>
                  <View style={[styles.crewAvatar, styles.crewAvatarActive]}>
                    <Text style={styles.crewInitial}>{(member.name || "W").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.crewInfo}>
                    <Text style={styles.crewName}>{member.name}</Text>
                    <Text style={styles.crewProject}>{member.projectName}  {member.elapsed}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clockOutBadge}
                    onPress={() => handleCrewClockOut(member)}
                    disabled={clockingOutMemberId === member.id}
                  >
                    {clockingOutMemberId === member.id ? (
                      <ActivityIndicator size={10} color="#FFFFFF" />
                    ) : (
                      <Ionicons name="stop" size={10} color="#FFFFFF" />
                    )}
                    <Text style={styles.clockOutBadgeText}>{t("time.out")}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {crewWorking.length === 0 && (
            <View style={styles.emptyCrewCard}>
              <Ionicons name="people-outline" size={20} color="#5A6A80" />
              <Text style={styles.emptyCrewText}>{t("time.noWorkersClockedIn")}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ================================================================ */}
      {/* SUPERVISOR CLOCK-IN MODAL */}
      {/* ================================================================ */}
      <Modal visible={showClockInModal} transparent animationType="slide" onRequestClose={() => setShowClockInModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clock In Employee</Text>
              <TouchableOpacity onPress={() => setShowClockInModal(false)}>
                <Ionicons name="close" size={24} color="#8892A4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Employee</Text>
              <SearchableSelect
                items={employees.map((e) => ({ id: e.id, name: e.name, subtitle: e.role || e.department }))}
                selectedId={clockInEmployee}
                onSelect={(item) => setClockInEmployee(item.id)}
                placeholder="Search employee..."
                icon="person-outline"
                iconColor="#10B981"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Project</Text>
              <SearchableSelect
                items={activeProjects.map((p) => ({ id: p.id, name: p.name, subtitle: p.clientName }))}
                selectedId={clockInProject}
                onSelect={(item) => setClockInProject(item.id)}
                placeholder="Search project..."
                icon="business-outline"
                iconColor="#5EEAD4"
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!clockInEmployee || !clockInProject) && styles.submitBtnDisabled]}
                onPress={handleSupervisorClockIn}
                disabled={clockInSubmitting || !clockInEmployee || !clockInProject}
                activeOpacity={0.7}
              >
                {clockInSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="play-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Clock In</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================================================================ */}
      {/* MANUAL ENTRY MODAL */}
      {/* ================================================================ */}
      <Modal visible={showManualModal} transparent animationType="slide" onRequestClose={() => setShowManualModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalContainer, { maxHeight: height * 0.85 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Time Entry</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <Ionicons name="close" size={24} color="#8892A4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Employee</Text>
              <SearchableSelect
                items={employees.map((e) => ({ id: e.id, name: e.name, subtitle: e.role || e.department }))}
                selectedId={manualEmployee}
                onSelect={(item) => setManualEmployee(item.id)}
                placeholder="Search employee..."
                icon="person-outline"
                iconColor="#10B981"
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Project</Text>
              <SearchableSelect
                items={activeProjects.map((p) => ({ id: p.id, name: p.name, subtitle: p.clientName }))}
                selectedId={manualProject}
                onSelect={(item) => setManualProject(item.id)}
                placeholder="Search project..."
                icon="business-outline"
                iconColor="#5EEAD4"
              />

              {/* Date */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowManualDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#8892A4" />
                <Text style={styles.dateBtnText}>{formatDate(manualDate)}</Text>
              </TouchableOpacity>
              {showManualDatePicker && (
                <DateTimePicker
                  value={manualDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowManualDatePicker(Platform.OS === "ios");
                    if (date) setManualDate(date);
                  }}
                  themeVariant="dark"
                />
              )}

              {/* Clock In Time */}
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>Clock In</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowManualClockInPicker(true)}>
                    <Ionicons name="time-outline" size={16} color="#10B981" />
                    <Text style={styles.dateBtnText}>{formatTime(manualClockIn)}</Text>
                  </TouchableOpacity>
                  {showManualClockInPicker && (
                    <DateTimePicker
                      value={manualClockIn}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_, date) => {
                        setShowManualClockInPicker(Platform.OS === "ios");
                        if (date) setManualClockIn(date);
                      }}
                      themeVariant="dark"
                    />
                  )}
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>Clock Out</Text>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowManualClockOutPicker(true)}>
                    <Ionicons name="time-outline" size={16} color="#EF4444" />
                    <Text style={styles.dateBtnText}>{formatTime(manualClockOut)}</Text>
                  </TouchableOpacity>
                  {showManualClockOutPicker && (
                    <DateTimePicker
                      value={manualClockOut}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_, date) => {
                        setShowManualClockOutPicker(Platform.OS === "ios");
                        if (date) setManualClockOut(date);
                      }}
                      themeVariant="dark"
                    />
                  )}
                </View>
              </View>

              {/* Calculated Hours */}
              {manualClockOut > manualClockIn && (
                <View style={styles.calcHours}>
                  <Ionicons name="hourglass-outline" size={14} color="#5EEAD4" />
                  <Text style={styles.calcHoursText}>
                    {((manualClockOut.getTime() - manualClockIn.getTime()) / 3600000).toFixed(1)} hours
                  </Text>
                </View>
              )}

              {/* Reason (required) */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Reason *</Text>
              <TextInput
                style={styles.textInput}
                value={manualReason}
                onChangeText={setManualReason}
                placeholder="e.g., Forgot to clock in, timesheet correction..."
                placeholderTextColor="#5A6A80"
                multiline
              />

              {/* Notes (optional) */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Notes</Text>
              <TextInput
                style={styles.textInput}
                value={manualNotes}
                onChangeText={setManualNotes}
                placeholder="Additional notes (optional)"
                placeholderTextColor="#5A6A80"
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, styles.submitBtnManual, (!manualEmployee || !manualProject || !manualReason.trim()) && styles.submitBtnDisabled]}
                onPress={handleManualEntry}
                disabled={manualSubmitting || !manualEmployee || !manualProject || !manualReason.trim()}
                activeOpacity={0.7}
              >
                {manualSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="create" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Create Manual Entry</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  scrollView: { flex: 1 },
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
  circularButtonDisabled: { backgroundColor: "#3A5A5A", opacity: 0.6 },
  circularButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginTop: 4, letterSpacing: 1 },

  // Supervisor Actions
  supervisorSection: { paddingHorizontal: 16, marginBottom: 12 },
  supervisorHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  supervisorTitle: { color: "#3B82F6", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  supervisorButtons: { flexDirection: "row", gap: 10 },
  supervisorBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#0F1D32", borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  supervisorBtnText: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },

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

  // =========================================================================
  // MODALS
  // =========================================================================
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#0F1D32",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: height * 0.75,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  modalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },

  // Form Fields
  fieldLabel: { color: "#8892A4", fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.5 },
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1A2A40", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dateBtnText: { color: "#E2E8F0", fontSize: 14 },
  timeRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  timeCol: { flex: 1 },
  calcHours: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#0A2A3A", borderRadius: 8,
  },
  calcHoursText: { color: "#5EEAD4", fontSize: 13, fontWeight: "600" },
  textInput: {
    backgroundColor: "#1A2A40", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: "#E2E8F0", fontSize: 14, minHeight: 44,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#10B981", borderRadius: 10,
    paddingVertical: 14, marginTop: 20,
  },
  submitBtnManual: { backgroundColor: "#F59E0B" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
