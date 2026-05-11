import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { apiClient, getStoredToken } from "@/services/api";
import { API_BASE_URL } from "@/constants/config";
import { useLanguageStore } from "@/store/languageStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

// ── Types ──────────────────────────────────────────────────────────────────
type ProjectDetailRouteParams = {
  ProjectDetail: { projectId: number };
};

type TabKey = "overview" | "team" | "documents" | "media" | "activity";

interface CompletionBookData {
  project: {
    id: number;
    name: string;
    description?: string;
    status: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    createdAt: string;
    budget?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    startDate?: string;
    endDate?: string;
    businessType?: string;
    propertyType?: string;
  };
  contractor: {
    name: string;
    type?: string;
    contactName?: string;
    phone?: string;
    email?: string;
  } | null;
  team: TeamMember[];
  timeEntries: number;
  media: MediaItem[];
  documents: DocItem[];
  activityLogs: ActivityItem[];
  financialSummary: {
    budgetAmount: number;
    proposalValue: number;
    totalLaborCost: number;
    totalMaterialCost: number;
    totalFuelCost: number;
    totalOtherCost: number;
    totalCost: number;
    totalHours: number;
    workerCount: number;
    profitMargin: number;
    costBreakdown: {
      labor: number;
      materials: number;
      fuel: number;
      other: number;
    };
  };
}

interface TeamMember {
  userId: number;
  name: string;
  hourlyRate: number;
  totalHours: number;
  totalCost: number;
  entryCount: number;
  lastWorked: string;
}

interface MediaItem {
  id: number;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface DocItem {
  id: number;
  name: string;
  fileName: string;
  url: string;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  details: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  createdBy: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (val: number) =>
  "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtHours = (h: number) => h.toFixed(1) + "h";

const statusColor: Record<string, string> = {
  active: "#10B981",
  paused: "#F59E0B",
  completed: "#3B82F6",
  ready_for_billing: "#8B5CF6",
  cancelled: "#EF4444",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  ready_for_billing: "Ready for Billing",
  cancelled: "Cancelled",
};

const activityIcon: Record<string, string> = {
  note: "document-text",
  call: "call",
  email: "mail",
  meeting: "people",
  visit: "location",
  status_change: "swap-horizontal",
  default: "ellipse",
};

const formatDate = (d: string | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatDateTime = (d: string | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

// ── Component ──────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
  const { t } = useLanguageStore();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProjectDetailRouteParams, "ProjectDetail">>();
  const projectId = route.params?.projectId;

  const [data, setData] = useState<CompletionBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const result = await apiClient.get<CompletionBookData>(
        "projects.getCompletionBook",
        { projectId }
      );
      if (result) setData(result);
    } catch (err) {
      console.warn("Failed to load project detail:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ── Media upload (same pattern as FieldMediaScreen) ──────────────────────
  const uploadFiles = async (files: { uri: string; name: string; type: string }[]) => {
    if (!projectId) return;
    setUploading(true);
    setUploadProgress(`Uploading 0/${files.length}...`);
    try {
      const token = await getStoredToken();
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${files.length}...`);
        const file = files[i];
        const formData = new FormData();
        formData.append("files", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        formData.append("projectId", projectId.toString());
        const response = await fetch(`${API_BASE_URL}/api/upload/field-media`, {
          method: "POST",
          headers: { Cookie: `app_session_id=${token}` },
          body: formData,
        });
        if (response.ok) successCount++;
      }
      if (successCount > 0) {
        Alert.alert("Success", `${successCount} file(s) uploaded`);
        fetchData();
      } else {
        Alert.alert("Error", "Upload failed. Please try again.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      await uploadFiles([{
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }]);
    }
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Photo library access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const files = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      await uploadFiles(files);
    }
  };

  // ── Share image via native share sheet ──────────────────────────────────
  const handleShareImage = async (imageUrl: string) => {
    try {
      setSharing(true);
      const fileName = imageUrl.split("/").pop() || "image.jpg";
      const localUri = FileSystem.cacheDirectory + fileName;
      const download = await FileSystem.downloadAsync(imageUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri);
      } else {
        Alert.alert("Sharing not available", "Sharing is not available on this device.");
      }
    } catch (err: any) {
      Alert.alert("Error", "Could not share image.");
    } finally {
      setSharing(false);
    }
  };

  // ── Image list for navigation ───────────────────────────────────────────
  const imageItems = data ? data.media.filter(
    (m) => m.mediaType === "photo" || m.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
  ) : [];

  // ── Open document URL ────────────────────────────────────────────────────
  const openDocument = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert("Error", "Cannot open this document");
      }
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load project</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { project, contractor, team, media, documents, activityLogs, financialSummary } = data;
  const fullAddress = [project.address, project.city, project.state, project.zipCode]
    .filter(Boolean)
    .join(", ");

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "overview", label: "Overview", icon: "information-circle" },
    { key: "team", label: "Team", icon: "people", count: team.length },
    { key: "documents", label: "Docs", icon: "document-text", count: documents.length },
    { key: "media", label: "Media", icon: "images", count: media.length },
    { key: "activity", label: "Activity", icon: "time", count: activityLogs.length },
  ];

  // ── Tab content renderers ────────────────────────────────────────────────

  const renderOverview = () => {
    const sc = statusColor[project.status] || "#5A6A80";
    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Project Header */}
        <View style={styles.sectionCard}>
          <View style={styles.projectHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName}>{project.name}</Text>
              {project.description ? (
                <Text style={styles.projectDesc}>{project.description}</Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: sc + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: sc }]} />
              <Text style={[styles.statusText, { color: sc }]}>
                {statusLabel[project.status] || project.status}
              </Text>
            </View>
          </View>

          {/* Info rows */}
          {fullAddress ? (
            <InfoRow icon="location" label="Address" value={fullAddress} />
          ) : null}
          {project.clientName ? (
            <InfoRow icon="person" label="Client" value={project.clientName} />
          ) : null}
          {project.clientPhone ? (
            <InfoRow icon="call" label="Phone" value={project.clientPhone} />
          ) : null}
          {project.clientEmail ? (
            <InfoRow icon="mail" label="Email" value={project.clientEmail} />
          ) : null}
          {project.startDate ? (
            <InfoRow icon="calendar" label="Start Date" value={formatDate(project.startDate)} />
          ) : null}
          {project.endDate ? (
            <InfoRow icon="calendar-outline" label="End Date" value={formatDate(project.endDate)} />
          ) : null}
          {project.businessType ? (
            <InfoRow icon="briefcase" label="Type" value={project.businessType} />
          ) : null}
        </View>

        {/* Contractor */}
        {contractor ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contractor</Text>
            <InfoRow icon="business" label="Company" value={contractor.name} />
            {contractor.contactName ? (
              <InfoRow icon="person" label="Contact" value={contractor.contactName} />
            ) : null}
            {contractor.phone ? (
              <InfoRow icon="call" label="Phone" value={contractor.phone} />
            ) : null}
            {contractor.email ? (
              <InfoRow icon="mail" label="Email" value={contractor.email} />
            ) : null}
          </View>
        ) : null}

        {/* Financial Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.finGrid}>
            <FinCard label="Proposal" value={fmt(financialSummary.proposalValue)} color="#3B82F6" />
            <FinCard label="Total Cost" value={fmt(financialSummary.totalCost)} color="#EF4444" />
            <FinCard label="Profit" value={fmt(financialSummary.proposalValue - financialSummary.totalCost)} color="#10B981" />
            <FinCard
              label="Margin"
              value={financialSummary.profitMargin.toFixed(1) + "%"}
              color={financialSummary.profitMargin >= 0 ? "#10B981" : "#EF4444"}
            />
          </View>

          {/* Cost Breakdown */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Cost Breakdown</Text>
          <CostBar label="Labor" amount={financialSummary.costBreakdown.labor} total={financialSummary.totalCost} color="#3B82F6" />
          <CostBar label="Materials" amount={financialSummary.costBreakdown.materials} total={financialSummary.totalCost} color="#F59E0B" />
          <CostBar label="Fuel" amount={financialSummary.costBreakdown.fuel} total={financialSummary.totalCost} color="#10B981" />
          <CostBar label="Other" amount={financialSummary.costBreakdown.other} total={financialSummary.totalCost} color="#8B5CF6" />
        </View>

        {/* Quick Stats */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <StatChip icon="people" label="Workers" value={String(financialSummary.workerCount)} />
            <StatChip icon="time" label="Hours" value={fmtHours(financialSummary.totalHours)} />
            <StatChip icon="document" label="Time Entries" value={String(data.timeEntries)} />
          </View>
        </View>

        {/* Job Cost button */}
        <TouchableOpacity
          style={styles.jobCostBtn}
          onPress={() => navigation.navigate("JobCost", { projectId: project.id })}
        >
          <Ionicons name="bar-chart" size={18} color="#FFFFFF" />
          <Text style={styles.jobCostBtnText}>View Full Job Cost Report</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderTeam = () => (
    <FlatList
      data={team}
      keyExtractor={(item) => String(item.userId)}
      contentContainerStyle={styles.listPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      renderItem={({ item }) => (
        <View style={styles.teamCard}>
          <View style={styles.teamAvatar}>
            <Text style={styles.teamAvatarText}>
              {(item.name || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName}>{item.name}</Text>
            <Text style={styles.teamSub}>
              {item.entryCount} entries · Last: {formatDate(item.lastWorked)}
            </Text>
          </View>
          <View style={styles.teamStats}>
            <Text style={styles.teamHours}>{fmtHours(item.totalHours)}</Text>
            <Text style={styles.teamCost}>{fmt(item.totalCost)}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyTitle}>No Team Members</Text>
          <Text style={styles.emptySub}>No workers have logged time on this project yet.</Text>
        </View>
      }
    />
  );

  const renderDocuments = () => (
    <FlatList
      data={documents}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listPadding}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.docCard} onPress={() => openDocument(item.url)}>
          <View style={styles.docIcon}>
            <Ionicons
              name={
                item.category === "contract"
                  ? "document-lock"
                  : item.category === "invoice"
                  ? "receipt"
                  : "document-text"
              }
              size={22}
              color="#3B82F6"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName} numberOfLines={1}>{item.name || item.fileName}</Text>
            <Text style={styles.docMeta}>
              {item.category} · {item.uploadedBy} · {formatDate(item.uploadedAt)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#5A6A80" />
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyTitle}>No Documents</Text>
          <Text style={styles.emptySub}>No documents have been uploaded for this project.</Text>
        </View>
      }
    />
  );

  const renderMedia = () => (
    <View style={{ flex: 1 }}>
      {/* Upload buttons */}
      <View style={styles.mediaActions}>
        <TouchableOpacity
          style={[styles.mediaBtn, uploading && styles.mediaBtnDisabled]}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Ionicons name="camera" size={18} color="#10B981" />
          <Text style={styles.mediaBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mediaBtn, uploading && styles.mediaBtnDisabled]}
          onPress={handlePickFromGallery}
          disabled={uploading}
        >
          <Ionicons name="images" size={18} color="#8B5CF6" />
          <Text style={styles.mediaBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Upload progress */}
      {uploading ? (
        <View style={styles.uploadBar}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadText}>{uploadProgress}</Text>
        </View>
      ) : null}

      {/* Media grid */}
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
            <TouchableOpacity
              style={styles.mediaThumb}
              onPress={() => {
                if (isImage) {
                  const idx = imageItems.findIndex((m) => m.id === item.id);
                  setPreviewIndex(idx >= 0 ? idx : 0);
                }
              }}
            >
              {isImage ? (
                <Image source={{ uri: item.url }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons
                    name={isVideo ? "videocam" : "document-text"}
                    size={28}
                    color="#3B82F6"
                  />
                </View>
              )}
              {isVideo ? (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                </View>
              ) : null}
              <Text style={styles.thumbLabel} numberOfLines={1}>
                {item.caption || item.fileName}
              </Text>
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

  const renderActivity = () => (
    <FlatList
      data={activityLogs}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listPadding}
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
              {item.details ? (
                <Text style={styles.activityDetails} numberOfLines={3}>{item.details}</Text>
              ) : null}
              <Text style={styles.activityMeta}>
                {item.createdBy} · {formatDateTime(item.createdAt)}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={40} color="#5A6A80" />
          <Text style={styles.emptyTitle}>No Activity</Text>
          <Text style={styles.emptySub}>No activity has been logged for this project.</Text>
        </View>
      }
    />
  );

  const tabContent: Record<TabKey, () => React.ReactElement> = {
    overview: renderOverview,
    team: renderTeam,
    documents: renderDocuments,
    media: renderMedia,
    activity: renderActivity,
  };

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? "#3B82F6" : "#5A6A80"}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && tab.count > 0 ? (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab content */}
      {tabContent[activeTab]()}

      {/* Image preview modal with navigation and share */}
      <Modal visible={previewIndex !== null} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          {/* Top bar: close + counter + share */}
          <View style={styles.previewTopBar}>
            <TouchableOpacity onPress={() => setPreviewIndex(null)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.previewCounter}>
              {previewIndex !== null ? `${previewIndex + 1} / ${imageItems.length}` : ""}
            </Text>
            <TouchableOpacity
              onPress={() => previewIndex !== null && handleShareImage(imageItems[previewIndex].url)}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="share-outline" size={26} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Image */}
          {previewIndex !== null && imageItems[previewIndex] ? (
            <Image
              source={{ uri: imageItems[previewIndex].url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}

          {/* File name */}
          {previewIndex !== null && imageItems[previewIndex] ? (
            <Text style={styles.previewFileName} numberOfLines={1}>
              {imageItems[previewIndex].caption || imageItems[previewIndex].fileName}
            </Text>
          ) : null}

          {/* Navigation arrows */}
          {previewIndex !== null && previewIndex > 0 ? (
            <TouchableOpacity
              style={[styles.previewNav, styles.previewNavLeft]}
              onPress={() => setPreviewIndex(previewIndex - 1)}
            >
              <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {previewIndex !== null && previewIndex < imageItems.length - 1 ? (
            <TouchableOpacity
              style={[styles.previewNav, styles.previewNavRight]}
              onPress={() => setPreviewIndex(previewIndex + 1)}
            >
              <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color="#5A6A80" style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function FinCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.finCard}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[styles.finValue, { color }]}>{value}</Text>
    </View>
  );
}

function CostBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.costBarRow}>
      <View style={styles.costBarLabel}>
        <View style={[styles.costBarDot, { backgroundColor: color }]} />
        <Text style={styles.costBarText}>{label}</Text>
      </View>
      <View style={styles.costBarTrack}>
        <View style={[styles.costBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.costBarAmount}>{fmt(amount)}</Text>
    </View>
  );
}

function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon as any} size={16} color="#3B82F6" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628" },
  errorText: { color: "#EF4444", fontSize: 16, marginTop: 12 },
  retryBtn: { marginTop: 16, backgroundColor: "#1E3A5F", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#3B82F6", fontWeight: "600" },

  // Tab bar
  tabBar: { backgroundColor: "#0F1D32", borderBottomWidth: 1, borderBottomColor: "#1A2A40" },
  tabScroll: { paddingHorizontal: 12, gap: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#3B82F6" },
  tabLabel: { color: "#5A6A80", fontSize: 13, fontWeight: "500" },
  tabLabelActive: { color: "#3B82F6" },
  tabBadge: {
    backgroundColor: "#1A2A40",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: { backgroundColor: "#1E3A5F" },
  tabBadgeText: { color: "#5A6A80", fontSize: 10, fontWeight: "700" },
  tabBadgeTextActive: { color: "#3B82F6" },

  // Tab content
  tabContent: { flex: 1 },
  listPadding: { padding: 16, paddingBottom: 40 },

  // Section cards
  sectionCard: {
    backgroundColor: "#0F1D32",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  sectionTitle: { color: "#8892A4", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },

  // Project header
  projectHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  projectName: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  projectDesc: { color: "#8892A4", fontSize: 13, marginTop: 4 },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6, marginLeft: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },

  // Info rows
  infoRow: { flexDirection: "row", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#1A2A4020" },
  infoLabel: { color: "#5A6A80", fontSize: 11, fontWeight: "500" },
  infoValue: { color: "#C8D0DC", fontSize: 13, marginTop: 1 },

  // Financial
  finGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  finCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 80) / 2 - 8,
    backgroundColor: "#0A1628",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  finLabel: { color: "#5A6A80", fontSize: 11, fontWeight: "500" },
  finValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },

  // Cost bars
  costBarRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  costBarLabel: { flexDirection: "row", alignItems: "center", width: 80, gap: 6 },
  costBarDot: { width: 8, height: 8, borderRadius: 4 },
  costBarText: { color: "#8892A4", fontSize: 12 },
  costBarTrack: { flex: 1, height: 6, backgroundColor: "#1A2A40", borderRadius: 3, overflow: "hidden" },
  costBarFill: { height: 6, borderRadius: 3 },
  costBarAmount: { color: "#C8D0DC", fontSize: 12, fontWeight: "600", width: 60, textAlign: "right" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: "#0A1628",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#5A6A80", fontSize: 11 },

  // Job Cost button
  jobCostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E3A5F",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  jobCostBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  // Team
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1A2A40",
    gap: 12,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
  },
  teamAvatarText: { color: "#3B82F6", fontSize: 16, fontWeight: "700" },
  teamName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  teamSub: { color: "#5A6A80", fontSize: 11, marginTop: 2 },
  teamStats: { alignItems: "flex-end" },
  teamHours: { color: "#3B82F6", fontSize: 14, fontWeight: "700" },
  teamCost: { color: "#8892A4", fontSize: 12, marginTop: 2 },

  // Documents
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1A2A40",
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
  },
  docName: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  docMeta: { color: "#5A6A80", fontSize: 11, marginTop: 2 },

  // Media
  mediaActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  mediaBtnDisabled: { opacity: 0.5 },
  mediaBtnText: { color: "#C8D0DC", fontSize: 13, fontWeight: "500" },
  uploadBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  uploadText: { color: "#3B82F6", fontSize: 13, fontWeight: "500" },
  gridContent: { paddingHorizontal: 16, paddingBottom: 24 },
  gridRow: { gap: 4, marginBottom: 4 },
  mediaThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0F1D32",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1D32",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  thumbLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#E2E8F0",
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  // Activity
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1A2A40",
    gap: 12,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  activityTitle: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  activityDetails: { color: "#8892A4", fontSize: 12, marginTop: 4, lineHeight: 18 },
  activityMeta: { color: "#5A6A80", fontSize: 11, marginTop: 6 },

  // Empty states
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  emptySub: { color: "#5A6A80", fontSize: 13, textAlign: "center", paddingHorizontal: 40 },

  // Image preview
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewTopBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  previewCounter: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  previewFileName: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  previewNav: {
    position: "absolute",
    top: "45%" as any,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  previewNavLeft: { left: 8 },
  previewNavRight: { right: 8 },
});
