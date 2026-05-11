import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, FlatList, Image,
  Alert, Modal, Dimensions, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient, getStoredToken } from "@/services/api";
import { API_BASE_URL } from "@/constants/config";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import SearchableSelect from "@/components/SearchableSelect";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useLanguageStore } from "@/store/languageStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

type JobCostRouteParams = { JobCost: { projectId?: number } };
type TabKey = "cost" | "media" | "documents" | "activity";

interface Project { id: number; name: string; status: string; }

// ── Cost data types ─────────────────────────────────────────────────────────
interface WorkerBreakdownItem {
  workerId: number; workerName: string; hours: number; daysWorked: number;
  hourlyRate: number; payType: string; totalCost: number; entries: number;
  payRate?: number; rateSource?: string;
}

interface NormalizedCostData {
  contractValue: number; actualCost: number; laborCost: number;
  materialsCost: number; otherCost: number; margin: number;
  marginPercent: string; budgetUsed: number;
  workerBreakdown: WorkerBreakdownItem[]; source: string;
}

// ── Media / Docs / Activity types ───────────────────────────────────────────
interface MediaItem {
  id: number; fileName: string; url: string; thumbnailUrl?: string;
  mediaType: string; caption?: string; uploadedAt: string; uploadedBy: string;
}
interface DocItem {
  id: number; name: string; fileName: string; url: string;
  category: string; uploadedAt: string; uploadedBy: string;
}
interface ActivityItem {
  id: number; type: string; title: string; details: string;
  contactName?: string; contactPhone?: string; createdAt: string; createdBy: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (val: number) =>
  "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
};
const formatDateTime = (d: string) => {
  try { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
};

const activityIcon: Record<string, string> = {
  time_entry: "time", media_upload: "camera", document_upload: "document-attach",
  status_change: "swap-horizontal", note: "chatbox-ellipses", default: "ellipse",
};

function normalizeApiResponse(raw: Record<string, any>): NormalizedCostData {
  if (raw.estimateType === "lump_sum" || raw.contractValue !== undefined) {
    const contractValue = Number(raw.contractValue || 0);
    const totalCosts = Number(raw.totalCosts || 0);
    const laborCost = Number(raw.costBreakdown?.labor || 0);
    const materialsCost = Number(raw.costBreakdown?.materials || 0);
    const fleetCost = Number(raw.costBreakdown?.fleet || 0);
    const otherCost = Number(raw.costBreakdown?.other || 0) + fleetCost;
    const margin = contractValue - totalCosts;
    const marginPercent = contractValue > 0 ? ((margin / contractValue) * 100).toFixed(1) : "0";
    const budgetUsed = contractValue > 0 ? Math.min((totalCosts / contractValue) * 100, 100) : 0;
    return { contractValue, actualCost: totalCosts, laborCost, materialsCost, otherCost, margin, marginPercent, budgetUsed, workerBreakdown: (raw.workerBreakdown || []) as WorkerBreakdownItem[], source: "lump_sum" };
  }
  const contractValue = Number(raw.summary?.estimatedTotal || 0);
  const actualCost = Number(raw.summary?.actualTotal || 0);
  const laborCost = (raw.labor || []).reduce((s: number, l: any) => s + Number(l.actualCost || 0), 0);
  const materialsCost = (raw.materials || []).reduce((s: number, m: any) => s + Number(m.actualTotal || 0), 0);
  const fleetCost = (raw.fleet || []).reduce((s: number, f: any) => s + Number(f.totalCost || 0), 0);
  const otherCost = (raw.otherCosts || []).reduce((s: number, o: any) => s + Number(o.actualAmount || 0), 0) + fleetCost;
  const margin = contractValue - actualCost;
  const marginPercent = contractValue > 0 ? ((margin / contractValue) * 100).toFixed(1) : "0";
  const budgetUsed = contractValue > 0 ? Math.min((actualCost / contractValue) * 100, 100) : 0;
  return { contractValue, actualCost, laborCost, materialsCost, otherCost, margin, marginPercent, budgetUsed, workerBreakdown: (raw.workerBreakdown || []) as WorkerBreakdownItem[], source: raw.source || "detailed" };
}

// ═══════════════════════════════════════════════════════════════════════════
export default function JobCostScreen() {
  const { t } = useLanguageStore();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<JobCostRouteParams, "JobCost">>();
  const initialProjectId = route.params?.projectId ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId);
  const [costData, setCostData] = useState<NormalizedCostData | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCost, setLoadingCost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("cost");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // ── Fetch projects list ─────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      const allProjects = (data || []).filter((p) => p.status === "active" || p.status === "completed");
      setProjects(allProjects);
      if (allProjects.length > 0 && !selectedProjectId && !initialProjectId) {
        setSelectedProjectId(allProjects[0].id);
      } else if (initialProjectId && !selectedProjectId) {
        setSelectedProjectId(initialProjectId);
      }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  // ── Fetch cost data ─────────────────────────────────────────────────────
  const fetchCostData = useCallback(async (projectId: number) => {
    setLoadingCost(true);
    try {
      const rawData = await apiClient.get<Record<string, any>>("reports.jobCostDetail", { projectId });
      if (rawData) { setCostData(normalizeApiResponse(rawData)); }
      else { setCostData(null); }
    } catch { setCostData(null); } finally { setLoadingCost(false); }
  }, []);

  // ── Fetch completion book (media, docs, activity) ───────────────────────
  const fetchCompletionBook = useCallback(async (projectId: number) => {
    try {
      const result = await apiClient.get<any>("projects.getCompletionBook", { projectId });
      if (result) {
        setMedia(result.media || []);
        setDocuments(result.documents || []);
        setActivityLogs(result.activityLogs || []);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    if (selectedProjectId) {
      fetchCostData(selectedProjectId);
      fetchCompletionBook(selectedProjectId);
    }
  }, [selectedProjectId, fetchCostData, fetchCompletionBook]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
    if (selectedProjectId) {
      fetchCostData(selectedProjectId);
      fetchCompletionBook(selectedProjectId);
    }
  };

  // ── Media upload ────────────────────────────────────────────────────────
  const uploadFiles = async (files: { uri: string; name: string; type: string }[]) => {
    if (!selectedProjectId) return;
    setUploading(true);
    setUploadProgress(`Uploading 0/${files.length}...`);
    try {
      const token = await getStoredToken();
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${files.length}...`);
        const file = files[i];
        const formData = new FormData();
        formData.append("files", { uri: file.uri, name: file.name, type: file.type } as any);
        formData.append("projectId", selectedProjectId.toString());
        const response = await fetch(`${API_BASE_URL}/api/upload/field-media`, {
          method: "POST",
          headers: { Cookie: `app_session_id=${token}` },
          body: formData,
        });
        if (response.ok) successCount++;
      }
      if (successCount > 0) {
        Alert.alert("Success", `${successCount} file(s) uploaded`);
        fetchCompletionBook(selectedProjectId);
      } else {
        Alert.alert("Error", "Upload failed. Please try again.");
      }
    } catch (err: any) { Alert.alert("Error", err?.message || "Upload failed"); }
    finally { setUploading(false); setUploadProgress(""); }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      await uploadFiles([{ uri: asset.uri, name: asset.fileName || `photo_${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" }]);
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Photo library access is needed."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const files = result.assets.map((a) => ({ uri: a.uri, name: a.fileName || `media_${Date.now()}.jpg`, type: a.mimeType || "image/jpeg" }));
      await uploadFiles(files);
    }
  };

  // ── Share image ─────────────────────────────────────────────────────────
  const handleShareImage = async (imageUrl: string) => {
    try {
      setSharing(true);
      const fileName = imageUrl.split("/").pop() || "image.jpg";
      const localUri = FileSystem.cacheDirectory + fileName;
      const download = await FileSystem.downloadAsync(imageUrl, localUri);
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(download.uri); }
      else { Alert.alert("Sharing not available", "Sharing is not available on this device."); }
    } catch { Alert.alert("Error", "Could not share image."); }
    finally { setSharing(false); }
  };

  // ── Open document ───────────────────────────────────────────────────────
  const openDocument = async (url: string) => {
    try { await WebBrowser.openBrowserAsync(url); }
    catch { try { await Linking.openURL(url); } catch { Alert.alert("Error", "Cannot open this document"); } }
  };

  // ── Image items for navigation ──────────────────────────────────────────
  const imageItems = media.filter(
    (m) => m.mediaType === "photo" || m.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
  );

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const contractValue = costData?.contractValue || 0;
  const actualCost = costData?.actualCost || 0;
  const laborCost = costData?.laborCost || 0;
  const materialsCost = costData?.materialsCost || 0;
  const otherCost = costData?.otherCost || 0;
  const margin = costData?.margin || 0;
  const marginPercent = costData?.marginPercent || "0";
  const budgetUsed = costData?.budgetUsed || 0;
  const totalBreakdown = laborCost + materialsCost + otherCost;
  const laborPct = totalBreakdown > 0 ? (laborCost / totalBreakdown * 100).toFixed(0) : "0";
  const materialsPct = totalBreakdown > 0 ? (materialsCost / totalBreakdown * 100).toFixed(0) : "0";
  const otherPct = totalBreakdown > 0 ? (otherCost / totalBreakdown * 100).toFixed(0) : "0";

  // ── Tabs config ─────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "cost", label: "Job Cost", icon: "analytics" },
    { key: "media", label: "Media", icon: "images", count: media.length },
    { key: "documents", label: "Docs", icon: "document-text", count: documents.length },
    { key: "activity", label: "Activity", icon: "time", count: activityLogs.length },
  ];

  // ── Tab renderers ───────────────────────────────────────────────────────
  const renderCostTab = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {loadingCost ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>{t("jobCost.loadingCostData")}</Text>
        </View>
      ) : !costData || (costData.contractValue === 0 && costData.actualCost === 0) ? (
        <View style={styles.emptyCard}>
          <Ionicons name="analytics-outline" size={32} color="#5A6A80" />
          <Text style={styles.emptyText}>{t("jobCost.noCostData")}</Text>
        </View>
      ) : (
        <>
          {/* Budget Used */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>{t("jobCost.budgetUsed")}</Text>
              <Text style={styles.budgetPercent}>{budgetUsed.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(budgetUsed, 100)}%` }, budgetUsed > 90 ? styles.progressDanger : budgetUsed > 70 ? styles.progressWarning : styles.progressNormal]} />
            </View>
            <View style={styles.budgetLabels}>
              <Text style={styles.budgetLabel}>{fmt(actualCost)} {t("jobCost.spent")}</Text>
              <Text style={styles.budgetLabel}>{fmt(contractValue)} {t("jobCost.budget")}</Text>
            </View>
          </View>

          {/* Metric Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.contractValue")}</Text>
              <Text style={[styles.metricValue, { color: "#3B82F6" }]}>{fmt(contractValue)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.actualCost")}</Text>
              <Text style={[styles.metricValue, { color: "#F59E0B" }]}>{fmt(actualCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.laborCost")}</Text>
              <Text style={[styles.metricValue, { color: "#8B5CF6" }]}>{fmt(laborCost)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t("jobCost.margin")}</Text>
              <Text style={[styles.metricValue, { color: margin >= 0 ? "#10B981" : "#EF4444" }]}>{fmt(margin)} ({marginPercent}%)</Text>
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("jobCost.costBreakdown")}</Text>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.breakdownName}>{t("jobCost.labor")}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{fmt(laborCost)}</Text>
                  <Text style={styles.breakdownPct}>{laborPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${laborPct}%` as unknown as number, backgroundColor: "#3B82F6" }]} />
              </View>

              <View style={[styles.breakdownRow, { marginTop: 14 }]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.breakdownName}>{t("jobCost.materials")}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{fmt(materialsCost)}</Text>
                  <Text style={styles.breakdownPct}>{materialsPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${materialsPct}%` as unknown as number, backgroundColor: "#10B981" }]} />
              </View>

              <View style={[styles.breakdownRow, { marginTop: 14 }]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.breakdownName}>{t("jobCost.other")}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownValue}>{fmt(otherCost)}</Text>
                  <Text style={styles.breakdownPct}>{otherPct}%</Text>
                </View>
              </View>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${otherPct}%` as unknown as number, backgroundColor: "#F59E0B" }]} />
              </View>
            </View>
          </View>

          {/* Worker Breakdown */}
          {costData.workerBreakdown && costData.workerBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("jobCost.workerBreakdown")}</Text>
              {costData.workerBreakdown.map((worker: WorkerBreakdownItem) => (
                <View key={worker.workerId} style={styles.workerRow}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitial}>{(worker.workerName || "W").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{worker.workerName}</Text>
                    <Text style={styles.workerMeta}>
                      {Number(worker.hours || 0).toFixed(1)}h · {worker.daysWorked}d · ${Number(worker.hourlyRate || worker.payRate || 0).toFixed(0)}/{worker.payType === "daily" ? "day" : worker.payType === "weekly" ? "wk" : "hr"}
                    </Text>
                  </View>
                  <Text style={styles.workerCost}>{fmt(Number(worker.totalCost || 0))}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 20 }} />
        </>
      )}
    </ScrollView>
  );

  const renderMediaTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.mediaActions}>
        <TouchableOpacity style={[styles.mediaBtn, uploading && styles.mediaBtnDisabled]} onPress={handleTakePhoto} disabled={uploading}>
          <Ionicons name="camera" size={18} color="#10B981" />
          <Text style={styles.mediaBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mediaBtn, uploading && styles.mediaBtnDisabled]} onPress={handlePickFromGallery} disabled={uploading}>
          <Ionicons name="images" size={18} color="#8B5CF6" />
          <Text style={styles.mediaBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      {uploading && (
        <View style={styles.uploadBar}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadText}>{uploadProgress}</Text>
        </View>
      )}
      <FlatList
        data={media}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        renderItem={({ item }) => {
          const isImage = item.mediaType === "photo" || item.url?.match(/\.(jpg|jpeg|png|gif|webp)/i);
          const isVideo = item.mediaType === "video";
          return (
            <TouchableOpacity style={styles.mediaThumb} onPress={() => {
              if (isImage) {
                const idx = imageItems.findIndex((m) => m.id === item.id);
                setPreviewIndex(idx >= 0 ? idx : 0);
              }
            }}>
              {isImage ? (
                <Image source={{ uri: item.url }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name={isVideo ? "videocam" : "document-text"} size={28} color="#3B82F6" />
                </View>
              )}
              {isVideo && <View style={styles.videoOverlay}><Ionicons name="play-circle" size={24} color="#FFFFFF" /></View>}
              <Text style={styles.thumbLabel} numberOfLines={1}>{item.caption || item.fileName}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={40} color="#5A6A80" />
            <Text style={styles.emptyTitle}>No Media</Text>
            <Text style={styles.emptySub}>Take a photo or upload from gallery.</Text>
          </View>
        }
      />
    </View>
  );

  const renderDocsTab = () => (
    <FlatList
      data={documents}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.docCard} onPress={() => openDocument(item.url)}>
          <View style={styles.docIcon}>
            <Ionicons name={item.category === "contract" ? "document-lock" : item.category === "invoice" ? "receipt" : "document-text"} size={22} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName} numberOfLines={1}>{item.name || item.fileName}</Text>
            <Text style={styles.docMeta}>{item.category} · {item.uploadedBy} · {formatDate(item.uploadedAt)}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#5A6A80" />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyTitle}>No Documents</Text>
          <Text style={styles.emptySub}>No documents uploaded for this project.</Text>
        </View>
      }
    />
  );

  const renderActivityTab = () => (
    <FlatList
      data={activityLogs}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      renderItem={({ item }) => {
        const iconName = activityIcon[item.type] || activityIcon.default;
        return (
          <View style={styles.activityCard}>
            <View style={styles.activityIconWrap}>
              <Ionicons name={iconName as any} size={16} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{item.title || item.type}</Text>
              {item.details ? <Text style={styles.activityDetails} numberOfLines={3}>{item.details}</Text> : null}
              <Text style={styles.activityMeta}>{item.createdBy} · {formatDateTime(item.createdAt)}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyTitle}>No Activity</Text>
          <Text style={styles.emptySub}>No activity logged for this project.</Text>
        </View>
      }
    />
  );

  const tabContent: Record<TabKey, () => React.ReactElement> = {
    cost: renderCostTab,
    media: renderMediaTab,
    documents: renderDocsTab,
    activity: renderActivityTab,
  };

  return (
    <View style={styles.container}>
      {/* Project selector */}
      <View style={{ paddingHorizontal: 0 }}>
        <SearchableSelect
          items={projects.map((p) => ({ id: p.id, name: p.name, subtitle: p.status }))}
          selectedId={selectedProjectId}
          onSelect={(item) => setSelectedProjectId(item.id)}
          onClear={() => setSelectedProjectId(null)}
          placeholder={t("time.searchProject")}
          icon="business-outline"
          iconColor="#3B82F6"
          label={t("common.job")}
        />
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={[styles.tabItem, active && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={(active ? tab.icon : tab.icon + "-outline") as any} size={16} color={active ? "#3B82F6" : "#5A6A80"} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tabContent[activeTab]()}
      </View>

      {/* Image preview modal with navigation and share */}
      <Modal visible={previewIndex !== null} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={styles.previewTopBar}>
            <TouchableOpacity onPress={() => setPreviewIndex(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.previewCounter}>
              {previewIndex !== null ? `${previewIndex + 1} / ${imageItems.length}` : ""}
            </Text>
            <TouchableOpacity onPress={() => previewIndex !== null && handleShareImage(imageItems[previewIndex].url)} disabled={sharing}>
              {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-outline" size={26} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
          {previewIndex !== null && imageItems[previewIndex] ? (
            <Image source={{ uri: imageItems[previewIndex].url }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
          {previewIndex !== null && imageItems[previewIndex] ? (
            <Text style={styles.previewFileName} numberOfLines={1}>
              {imageItems[previewIndex].caption || imageItems[previewIndex].fileName}
            </Text>
          ) : null}
          {previewIndex !== null && previewIndex > 0 ? (
            <TouchableOpacity style={[styles.previewNav, styles.previewNavLeft]} onPress={() => setPreviewIndex(previewIndex - 1)}>
              <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {previewIndex !== null && previewIndex < imageItems.length - 1 ? (
            <TouchableOpacity style={[styles.previewNav, styles.previewNavRight]} onPress={() => setPreviewIndex(previewIndex + 1)}>
              <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },

  // Tab bar
  tabBar: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: "#1A2A40" },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: "center" },
  tabItem: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#3B82F6" },
  tabLabel: { color: "#5A6A80", fontSize: 13, fontWeight: "500" },
  tabLabelActive: { color: "#3B82F6", fontWeight: "600" },
  tabBadge: { backgroundColor: "#1A2A40", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  tabBadgeActive: { backgroundColor: "#1E3A5F" },
  tabBadgeText: { color: "#5A6A80", fontSize: 10, fontWeight: "600" },
  tabBadgeTextActive: { color: "#3B82F6" },

  // Loading
  loadingSection: { alignItems: "center", paddingVertical: 40, gap: 8 },
  loadingText: { color: "#8892A4", fontSize: 13 },

  // Empty
  emptyCard: { margin: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 32, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1A2A40" },
  emptyText: { color: "#5A6A80", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  emptySub: { color: "#5A6A80", fontSize: 13, textAlign: "center", paddingHorizontal: 40 },

  // Budget Section
  budgetSection: { margin: 16, backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  budgetTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  budgetPercent: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  progressBar: { height: 8, backgroundColor: "#1A2A40", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressNormal: { backgroundColor: "#10B981" },
  progressWarning: { backgroundColor: "#F59E0B" },
  progressDanger: { backgroundColor: "#EF4444" },
  budgetLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetLabel: { color: "#8892A4", fontSize: 11 },

  // Metrics Grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  metricCard: { width: "48%", backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#1A2A40" },
  metricLabel: { color: "#8892A4", fontSize: 11, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "700" },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 12 },

  // Cost Breakdown
  breakdownCard: { backgroundColor: "#0F1D32", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1A2A40" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownName: { color: "#E2E8F0", fontSize: 13, fontWeight: "500" },
  breakdownRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  breakdownPct: { color: "#8892A4", fontSize: 11, width: 32, textAlign: "right" },
  breakdownBarBg: { height: 4, backgroundColor: "#1A2A40", borderRadius: 2, marginTop: 6, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 2 },

  // Worker Breakdown
  workerRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#0F1D32", borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: "#1A2A40" },
  workerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center", marginRight: 10 },
  workerInitial: { color: "#3B82F6", fontSize: 13, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerName: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  workerMeta: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  workerCost: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Media tab
  mediaActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  mediaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0F1D32", borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: "#1A2A40" },
  mediaBtnDisabled: { opacity: 0.5 },
  mediaBtnText: { color: "#E2E8F0", fontSize: 14, fontWeight: "500" },
  uploadBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  uploadText: { color: "#3B82F6", fontSize: 13 },
  gridRow: { paddingHorizontal: 16, gap: 4 },
  gridContent: { paddingBottom: 20 },
  mediaThumb: { width: THUMB_SIZE, marginBottom: 4, borderRadius: 8, overflow: "hidden", backgroundColor: "#0F1D32" },
  thumbImage: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 },
  thumbPlaceholder: { width: THUMB_SIZE, height: THUMB_SIZE, justifyContent: "center", alignItems: "center", backgroundColor: "#0F1D32" },
  videoOverlay: { position: "absolute", top: 0, left: 0, width: THUMB_SIZE, height: THUMB_SIZE, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  thumbLabel: { color: "#8892A4", fontSize: 9, paddingHorizontal: 4, paddingVertical: 3 },

  // Documents tab
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  docIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center" },
  docName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  docMeta: { color: "#5A6A80", fontSize: 11, marginTop: 2 },

  // Activity tab
  activityCard: { flexDirection: "row", gap: 12, backgroundColor: "#0F1D32", borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1A2A40" },
  activityIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1E3A5F", justifyContent: "center", alignItems: "center" },
  activityTitle: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  activityDetails: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  activityMeta: { color: "#5A6A80", fontSize: 11, marginTop: 4 },

  // Image preview
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.97)", justifyContent: "center", alignItems: "center" },
  previewTopBar: { position: "absolute", top: 50, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, zIndex: 10 },
  previewCounter: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  previewImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  previewFileName: { color: "#8892A4", fontSize: 12, marginTop: 12, textAlign: "center", paddingHorizontal: 20 },
  previewNav: { position: "absolute", top: "45%" as any, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 24, width: 48, height: 48, alignItems: "center", justifyContent: "center", zIndex: 10 },
  previewNavLeft: { left: 8 },
  previewNavRight: { right: 8 },
});
