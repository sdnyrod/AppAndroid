import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { apiClient, getStoredToken } from "@/services/api";
import { API_BASE_URL } from "@/constants/config";
import SearchableSelect from "@/components/SearchableSelect";

import { useLanguageStore } from "@/store/languageStore";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = (SCREEN_WIDTH - 48 - 8) / 3; // 3 columns with gaps

interface MediaItem {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  mediaType: string;
  caption?: string;
  uploadedAt: string;
  tags?: string[];
}

interface Project {
  id: number;
  name: string;
}

export default function FieldMediaScreen() {
  const { t } = useLanguageStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load projects
  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      setProjects(data || []);
      // Auto-select first project if none selected
      if (!selectedProject && data && data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch {}
  }, []);

  // Load media for selected project
  const fetchMedia = useCallback(async () => {
    if (!selectedProject) {
      setMediaItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiClient.get<any[]>("fieldMedia.getByProject", {
        projectId: selectedProject.id,
      });
      // Flatten the response - backend returns { media: {...}, user: {...} }
      const items = (data || []).map((item: any) => {
        const m = item.media || item;
        return {
          id: m.id,
          fileName: m.fileName,
          fileUrl: m.fileUrl || m.url,
          mimeType: m.mimeType,
          mediaType: m.mediaType,
          caption: m.caption || m.title,
          uploadedAt: m.uploadedAt || m.createdAt,
          tags: m.tags,
        };
      });
      setMediaItems(items);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      setLoading(true);
      fetchMedia();
    }
  }, [selectedProject, fetchMedia]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  // Upload file to backend via multipart/form-data
  const uploadFiles = async (files: { uri: string; name: string; type: string }[]) => {
    if (!selectedProject) {
      Alert.alert(t("common.error"), "Please select a project first");
      return;
    }

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
        formData.append("projectId", selectedProject.id.toString());

        const response = await fetch(`${API_BASE_URL}/api/upload/field-media`, {
          method: "POST",
          headers: {
            Cookie: `app_session_id=${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`Upload failed for ${file.name}:`, errData);
        }
      }

      if (successCount > 0) {
        Alert.alert(t("common.success"), `${successCount} file(s) uploaded successfully`);
        fetchMedia();
      } else {
        Alert.alert(t("common.error"), "All uploads failed. Please try again.");
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || "Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Camera: Take Photo
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("fieldMedia.permissionRequired"), "Camera access is needed to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      await uploadFiles([{ uri: asset.uri, name: fileName, type: asset.mimeType || "image/jpeg" }]);
    }
  };

  // Camera: Record Video
  const handleRecordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to record video.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 120, // 2 minutes max
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      // Check file size (16MB limit)
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 16 * 1024 * 1024) {
        Alert.alert(t("fieldMedia.fileTooLarge"), "Video must be under 16MB. Try recording a shorter clip.");
        return;
      }
      const fileName = asset.fileName || `video_${Date.now()}.mp4`;
      await uploadFiles([{ uri: asset.uri, name: fileName, type: asset.mimeType || "video/mp4" }]);
    }
  };

  // Gallery: Pick Photos/Videos
  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Photo library access is needed to select files.");
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
        name: asset.fileName || `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${asset.mimeType?.includes("video") ? "mp4" : "jpg"}`,
        type: asset.mimeType || (asset.uri.includes(".mp4") ? "video/mp4" : "image/jpeg"),
      }));
      await uploadFiles(files);
    }
  };

  // Document Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const files = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        }));

        // Check file sizes
        for (const file of files) {
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          if (fileInfo.exists && fileInfo.size && fileInfo.size > 16 * 1024 * 1024) {
            Alert.alert("File Too Large", `${file.name} exceeds 16MB limit.`);
            return;
          }
        }

        await uploadFiles(files);
      }
    } catch (err: any) {
      if (err?.code !== "DOCUMENT_PICKER_CANCELED") {
        Alert.alert(t("common.error"), "Failed to pick document");
      }
    }
  };

  // Delete media
  const handleDelete = (item: MediaItem) => {
    Alert.alert(t("common.delete"), `Delete "${item.caption || item.fileName}"?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          const result = await apiClient.post("fieldMedia.delete", { id: item.id });
          if (result.ok) {
            setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
          } else {
            Alert.alert(t("common.error"), "Failed to delete");
          }
        },
      },
    ]);
  };

  // Render media thumbnail with loading state
  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    const isImage = item.mimeType?.startsWith("image/");
    const isVideo = item.mimeType?.startsWith("video/");
    const [thumbLoading, setThumbLoading] = useState(true);
    const [thumbError, setThumbError] = useState(false);

    return (
      <TouchableOpacity
        style={styles.mediaThumb}
        onPress={() => isImage && setPreviewImage(item.fileUrl)}
        onLongPress={() => handleDelete(item)}
      >
        {isImage ? (
          <>
            {thumbLoading && (
              <View style={styles.thumbLoadingOverlay}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            )}
            {thumbError ? (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="image-outline" size={28} color="#5A6A80" />
                <Text style={{ color: "#5A6A80", fontSize: 9, marginTop: 2 }}>{item.fileName}</Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.fileUrl }}
                style={styles.thumbImage}
                resizeMode="cover"
                onLoadEnd={() => setThumbLoading(false)}
                onError={() => { setThumbLoading(false); setThumbError(true); }}
              />
            )}
          </>
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons
              name={isVideo ? "videocam" : "document-text"}
              size={28}
              color="#3B82F6"
            />
          </View>
        )}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={24} color="#FFFFFF" />
          </View>
        )}
        <Text style={styles.thumbLabel} numberOfLines={1}>
          {item.caption || item.fileName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Project Search Selector */}
      <SearchableSelect
        items={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedId={selectedProject?.id || null}
        onSelect={(item) => setSelectedProject({ id: item.id, name: item.name })}
        placeholder={t("time.searchProject")}
        icon="folder-outline"
        iconColor="#F59E0B"
        label={t("common.project")}
      />

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <ActionButton
          icon="camera"
          label={t("fieldMedia.photo")}
          color="#10B981"
          onPress={handleTakePhoto}
          disabled={uploading || !selectedProject}
        />
        <ActionButton
          icon="videocam"
          label={t("fieldMedia.video")}
          color="#F59E0B"
          onPress={handleRecordVideo}
          disabled={uploading || !selectedProject}
        />
        <ActionButton
          icon="images"
          label={t("fieldMedia.gallery")}
          color="#8B5CF6"
          onPress={handlePickFromGallery}
          disabled={uploading || !selectedProject}
        />
        <ActionButton
          icon="document-text"
          label={t("fieldMedia.document")}
          color="#3B82F6"
          onPress={handlePickDocument}
          disabled={uploading || !selectedProject}
        />
      </View>

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadingText}>{uploadProgress}</Text>
        </View>
      )}

      {/* Media Grid */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
          }
          renderItem={renderMediaItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="camera-outline" size={48} color="#5A6A80" />
              <Text style={styles.emptyTitle}>{t("fieldMedia.noMediaYet")}</Text>
              <Text style={styles.emptySubtitle}>
                Take a photo, record a video, or upload from your gallery
              </Text>
            </View>
          }
        />
      )}



      {/* Image Preview Modal with Pinch-to-Zoom */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ZoomablePreview
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

// Zoomable Image Preview with Pinch-to-Zoom and Pan
function ZoomablePreview({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [imageLoading, setImageLoading] = useState(true);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 5) {
        scale.value = withTiming(5);
        savedScale.value = 5;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.previewOverlay}>
      <TouchableOpacity style={styles.previewClose} onPress={onClose}>
        <Ionicons name="close-circle" size={36} color="#FFFFFF" />
      </TouchableOpacity>
      {imageLoading && (
        <ActivityIndicator size="large" color="#3B82F6" style={{ position: "absolute" }} />
      )}
      {imageUrl && (
        <GestureDetector gesture={composed}>
          <Animated.Image
            source={{ uri: imageUrl }}
            style={[styles.previewImage, animatedStyle]}
            resizeMode="contain"
            onLoadEnd={() => setImageLoading(false)}
          />
        </GestureDetector>
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Project Selector
  projectSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
    gap: 8,
  },
  projectName: { flex: 1, color: "#E2E8F0", fontSize: 14, fontWeight: "500" },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  actionButtonDisabled: { opacity: 0.4 },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { color: "#8892A4", fontSize: 11, fontWeight: "500" },

  // Upload Progress
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  uploadingText: { color: "#3B82F6", fontSize: 13, fontWeight: "500" },

  // Media Grid
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

  // Empty State
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "600" },
  emptySubtitle: { color: "#5A6A80", fontSize: 13, textAlign: "center", paddingHorizontal: 40 },

  // Project Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1D32",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  modalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  projectItemActive: { backgroundColor: "#1E3A5F20" },
  projectItemText: { flex: 1, color: "#C8D0DC", fontSize: 14 },
  projectItemTextActive: { color: "#3B82F6", fontWeight: "600" },

  // Image Preview Modal
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  thumbLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1D32",
    zIndex: 1,
  },
});
