import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface DailyLog {
  id: number;
  activity?: {
    id: number;
    activityType: string;
    title: string;
    content: string;
    activityDate: string;
    createdBy: number;
    attachments?: Array<{ fileName: string; fileUrl: string; mimeType: string }>;
  };
  projectName?: string;
  createdByName?: string;
}

export default function DailyLogsScreen() {
  const { t } = useLanguageStore();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.query<DailyLog[]>("dailyLog.getAll");
      if (res.ok && res.data) {
        setLogs(Array.isArray(res.data) ? res.data : []);
      } else {
        setLogs([]);
        if (res.error) setError(res.error);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
      });
    } catch { return dateStr; }
  };

  const renderLog = ({ item }: { item: DailyLog }) => {
    const activity = item.activity;
    if (!activity) return null;
    const isAudio = activity.activityType === "daily_audio_log";
    const hasAttachments = activity.attachments && activity.attachments.length > 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={isAudio ? "mic-outline" : "document-text-outline"}
              size={16}
              color={isAudio ? "#F59E0B" : "#60A5FA"}
            />
            <Text style={styles.title} numberOfLines={1}>{activity.title}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(activity.activityDate)}</Text>
        </View>
        <View style={styles.cardBody}>
          {item.projectName && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={13} color="#8892A4" />
              <Text style={styles.projectText}>{item.projectName}</Text>
            </View>
          )}
          {activity.content && (
            <Text style={styles.contentText} numberOfLines={6}>
              {activity.content}
            </Text>
          )}
          {hasAttachments && (
            <View style={styles.attachmentRow}>
              <Ionicons name="attach-outline" size={13} color="#8892A4" />
              <Text style={styles.attachmentText}>
                {activity.attachments!.length} {t("fieldMedia.documents") || "attachment(s)"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>{t("common.loading") || "Loading..."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{logs.length}</Text>
          <Text style={styles.summaryLabel}>{t("dailyLogs.title") || "Daily Logs"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {logs.filter((l) => l.activity?.activityType === "daily_audio_log").length}
          </Text>
          <Text style={styles.summaryLabel}>{t("dailyLogs.audioLogs") || "Audio Logs"}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {logs.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-outline" size={48} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("dailyLogs.noLogs") || "No daily logs found"}</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => (item.activity?.id || index).toString()}
          renderItem={renderLog}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#3B82F6"
              colors={["#3B82F6"]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#0A1628", padding: 24,
  },
  loadingText: { color: "#8892A4", fontSize: 14, marginTop: 12 },
  summaryRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10,
  },
  summaryCard: {
    flex: 1, backgroundColor: "#0F1D32", borderRadius: 10, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  summaryNumber: { color: "#E2E8F0", fontSize: 20, fontWeight: "700" },
  summaryLabel: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10,
    backgroundColor: "#7F1D1D", borderRadius: 8,
  },
  errorBannerText: { color: "#FCA5A5", fontSize: 13, flex: 1 },
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 24,
  },
  emptyText: { color: "#8892A4", fontSize: 14, marginTop: 12, textAlign: "center" },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: "#1A2A40", overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  title: { color: "#E2E8F0", fontSize: 14, fontWeight: "600", flex: 1 },
  dateText: { color: "#8892A4", fontSize: 11 },
  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  projectText: { color: "#60A5FA", fontSize: 12, fontWeight: "500" },
  contentText: { color: "#CBD5E1", fontSize: 13, lineHeight: 20 },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  attachmentText: { color: "#8892A4", fontSize: 11 },
});
