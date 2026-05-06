import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";

const { width } = Dimensions.get("window");
const DAY_WIDTH = (width - 32) / 7;

interface ScheduleEvent {
  id: number;
  projectId: number;
  projectName: string;
  projectAddress: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  memo: string | null;
  crew: { scheduleId: number; userId: number; userName: string }[];
  vehicles: { scheduleId: number; vehicleId: number; vehicleName: string }[];
  materials: { scheduleId: number; materialName: string; estimatedQuantity: number; unit: string }[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export default function JobScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const data = await apiClient.get<ScheduleEvent[]>("scheduling.getByDateRange", { startDate, endDate });
      setEvents(data || []);
    } catch (e) {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);
  const onRefresh = () => { setRefreshing(true); fetchSchedule(); };

  // Calendar data
  const daysInMonth = useMemo(() => getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);
  const firstDayOfWeek = daysInMonth[0].getDay();
  const today = new Date();

  // Events for selected date
  const selectedEvents = useMemo(() => {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : start;
      return selectedDate >= new Date(start.toDateString()) && selectedDate <= new Date(end.toDateString());
    });
  }, [events, selectedDate]);

  // Dates that have events
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : start;
      const current = new Date(start);
      while (current <= end) {
        dates.add(current.toDateString());
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [events]);

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "#10B981";
      case "in_progress": return "#3B82F6";
      case "pending": return "#F59E0B";
      case "completed": return "#8B5CF6";
      default: return "#5A6A80";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
    >
      {/* Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNav}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthNav}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {/* Empty cells for days before first day of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.dayCell} />
        ))}
        {/* Day cells */}
        {daysInMonth.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const hasEvent = eventDates.has(day.toDateString());
          return (
            <TouchableOpacity
              key={day.getDate()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(new Date(day))}
            >
              <Text style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
                isToday && !isSelected && styles.dayTextToday,
              ]}>
                {day.getDate()}
              </Text>
              {hasEvent && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Label */}
      <View style={styles.selectedDateSection}>
        <Text style={styles.selectedDateText}>
          {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
        <Text style={styles.eventCount}>
          {selectedEvents.length} {selectedEvents.length === 1 ? "job" : "jobs"}
        </Text>
      </View>

      {/* Job Cards */}
      {selectedEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color="#5A6A80" />
          <Text style={styles.emptyText}>No jobs scheduled for this day</Text>
        </View>
      ) : (
        selectedEvents.map((event) => (
          <View key={event.id} style={styles.jobCard}>
            {/* Header */}
            <View style={styles.jobCardHeader}>
              <View style={[styles.jobStatusDot, { backgroundColor: getStatusColor(event.status) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.jobProjectName}>{event.projectName}</Text>
                {event.projectAddress && (
                  <Text style={styles.jobAddress}>{event.projectAddress}</Text>
                )}
              </View>
              <View style={[styles.jobStatusBadge, { backgroundColor: getStatusColor(event.status) + "20" }]}>
                <Text style={[styles.jobStatusText, { color: getStatusColor(event.status) }]}>
                  {event.status.replace("_", " ")}
                </Text>
              </View>
            </View>

            {/* Memo */}
            {event.memo && (
              <Text style={styles.jobMemo}>{event.memo}</Text>
            )}

            {/* Crew Chips */}
            {event.crew.length > 0 && (
              <View style={styles.chipSection}>
                <Ionicons name="people-outline" size={14} color="#8892A4" />
                <View style={styles.chipRow}>
                  {event.crew.map((c, idx) => (
                    <View key={idx} style={styles.chip}>
                      <Text style={styles.chipText}>{c.userName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Vehicle Chips */}
            {event.vehicles.length > 0 && (
              <View style={styles.chipSection}>
                <Ionicons name="car-outline" size={14} color="#8892A4" />
                <View style={styles.chipRow}>
                  {event.vehicles.map((v, idx) => (
                    <View key={idx} style={[styles.chip, styles.chipVehicle]}>
                      <Text style={styles.chipText}>{v.vehicleName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Material Chips */}
            {event.materials.length > 0 && (
              <View style={styles.chipSection}>
                <Ionicons name="cube-outline" size={14} color="#8892A4" />
                <View style={styles.chipRow}>
                  {event.materials.map((m, idx) => (
                    <View key={idx} style={[styles.chip, styles.chipMaterial]}>
                      <Text style={styles.chipText}>
                        {m.materialName} ({m.estimatedQuantity} {m.unit})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.jobActions}>
              {event.status !== "completed" && event.status !== "in_progress" && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnStart]}>
                  <Ionicons name="play" size={14} color="#10B981" />
                  <Text style={[styles.actionBtnText, { color: "#10B981" }]}>Start</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnEdit]}>
                <Ionicons name="create-outline" size={14} color="#3B82F6" />
                <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>Edit</Text>
              </TouchableOpacity>
              {event.status !== "completed" && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCancel]}>
                  <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Month Header
  monthHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 16,
  },
  monthNav: { padding: 8 },
  monthTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  // Weekday Row
  weekdayRow: { flexDirection: "row", paddingHorizontal: 16 },
  weekdayText: { width: DAY_WIDTH, textAlign: "center", color: "#8892A4", fontSize: 12, fontWeight: "600", marginBottom: 8 },

  // Calendar Grid
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  dayCell: {
    width: DAY_WIDTH, height: 40, justifyContent: "center", alignItems: "center",
  },
  dayCellSelected: { backgroundColor: "#3B82F6", borderRadius: 20 },
  dayCellToday: { borderWidth: 1, borderColor: "#3B82F6", borderRadius: 20 },
  dayText: { color: "#E2E8F0", fontSize: 14 },
  dayTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  dayTextToday: { color: "#3B82F6", fontWeight: "600" },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#10B981", marginTop: 2 },
  eventDotSelected: { backgroundColor: "#FFFFFF" },

  // Selected Date Section
  selectedDateSection: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#1A2A40",
    marginTop: 8,
  },
  selectedDateText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  eventCount: { color: "#8892A4", fontSize: 13 },

  // Empty
  emptyCard: {
    marginHorizontal: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 32,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40",
  },
  emptyText: { color: "#5A6A80", fontSize: 14 },

  // Job Card
  jobCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: "#0F1D32",
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40",
  },
  jobCardHeader: { flexDirection: "row", alignItems: "flex-start" },
  jobStatusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  jobProjectName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  jobAddress: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  jobStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  jobStatusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  jobMemo: { color: "#8892A4", fontSize: 12, marginTop: 10, fontStyle: "italic" },

  // Chips
  chipSection: { flexDirection: "row", alignItems: "flex-start", marginTop: 10, gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 6 },
  chip: {
    backgroundColor: "#1A2A40", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  chipVehicle: { backgroundColor: "#1E3A5F" },
  chipMaterial: { backgroundColor: "#2D1B4E" },
  chipText: { color: "#E2E8F0", fontSize: 11 },

  // Action Buttons
  jobActions: { flexDirection: "row", marginTop: 14, gap: 10, borderTopWidth: 1, borderTopColor: "#1A2A40", paddingTop: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnStart: { borderColor: "#10B981" },
  actionBtnEdit: { borderColor: "#3B82F6" },
  actionBtnCancel: { borderColor: "#EF4444" },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
});
