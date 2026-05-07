import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { apiClient } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORIES = [
  { value: "material", label: "Material", icon: "cube-outline" },
  { value: "labor", label: "Labor", icon: "people-outline" },
  { value: "equipment", label: "Equipment", icon: "construct-outline" },
  { value: "fuel", label: "Fuel", icon: "car-outline" },
  { value: "subcontractor", label: "Subcontractor", icon: "business-outline" },
  { value: "permit", label: "Permit", icon: "document-text-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

interface Expense {
  id: number;
  projectId: number;
  category: string;
  description: string;
  vendor?: string;
  amount: string;
  receiptUrl?: string;
  expenseDate: string;
  notes?: string;
  project?: { name: string };
}

interface Project {
  id: number;
  name: string;
  status?: string;
}

interface ScanResult {
  success: boolean;
  vendor?: string;
  date?: string;
  total?: number;
  items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  category?: string;
  receiptUrl?: string;
  notesBreakdown?: string;
  paymentMethod?: string;
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // SELECTED PROJECT — the key state for job-first flow
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Scan confirmation dialog
  const [showScanConfirm, setShowScanConfirm] = useState(false);

  // Form state (for manual entry / edit)
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    projectId: 0,
    category: "other" as string,
    description: "",
    vendor: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    notes: "",
    receiptUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Receipt preview
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await apiClient.get<any>("expenses.list");
      if (Array.isArray(data)) {
        setExpenses(data);
      } else if (data && (data as any).items) {
        setExpenses((data as any).items);
      } else {
        setExpenses([]);
      }
    } catch (e) {
      console.warn("Failed to fetch expenses:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiClient.get<Project[]>("projects.list");
      setProjects(data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
  }, [fetchExpenses, fetchProjects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const getSelectedProject = () => projects.find((p) => p.id === selectedProjectId);
  const getProjectName = (projectId: number) => projects.find((p) => p.id === projectId)?.name || `Project #${projectId}`;

  // Filter expenses by selected project
  const filteredExpenses = selectedProjectId
    ? expenses.filter((e) => e.projectId === selectedProjectId)
    : expenses;

  // =========================================================================
  // RECEIPT SCANNING (Camera + AI OCR) — only available AFTER project selected
  // =========================================================================
  const handleScanReceipt = async () => {
    if (!selectedProjectId) {
      Alert.alert("Select a Project", "Please select a project/job first before scanning a receipt.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to scan receipts.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      await processReceiptImage(result.assets[0].uri);
    }
  };

  const handlePickReceipt = async () => {
    if (!selectedProjectId) {
      Alert.alert("Select a Project", "Please select a project/job first before scanning a receipt.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      await processReceiptImage(result.assets[0].uri);
    }
  };

  const processReceiptImage = async (uri: string) => {
    setScanning(true);
    try {
      // Compress and resize image for upload (max 1MB)
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call backend OCR
      const response = await apiClient.post<ScanResult>("expenses.scanReceipt", {
        imageBase64: base64,
        mimeType: "image/jpeg",
        fileName: `receipt_${Date.now()}.jpg`,
      });

      if (response.ok && response.data?.success) {
        const scan = response.data;
        setScanResult(scan);

        // Pre-fill form with extracted data + selected project
        setFormData({
          projectId: selectedProjectId!,
          category: scan.category || "other",
          description: scan.items && scan.items.length > 0
            ? scan.items.map((i) => i.description).join(", ")
            : "Scanned receipt",
          vendor: scan.vendor || "",
          amount: scan.total?.toFixed(2) || "",
          expenseDate: scan.date || new Date().toISOString().split("T")[0],
          notes: scan.notesBreakdown || "",
          receiptUrl: scan.receiptUrl || "",
        });

        // Show confirmation dialog with summary
        setShowScanConfirm(true);
      } else {
        Alert.alert("Scan Failed", "Could not extract data from the receipt. Please enter manually.");
        resetForm();
        if (selectedProjectId) {
          setFormData((prev) => ({ ...prev, projectId: selectedProjectId }));
        }
        setShowForm(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to scan receipt. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  // Confirm scanned expense — launches it directly
  const handleConfirmScan = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post("expenses.createFromScan", {
        projectId: formData.projectId,
        category: formData.category,
        description: formData.description,
        vendor: formData.vendor || undefined,
        amount: formData.amount,
        receiptUrl: formData.receiptUrl,
        expenseDate: formData.expenseDate,
        notes: formData.notes || undefined,
      });
      if (res.ok) {
        Alert.alert(
          "✓ Expense Recorded",
          `$${formData.amount} — ${formData.vendor || formData.description}\nProject: ${getProjectName(formData.projectId)}\nReceipt attached ✓`
        );
        setShowScanConfirm(false);
        setScanResult(null);
        resetForm();
        fetchExpenses();
      } else {
        Alert.alert("Error", res.error || "Failed to create expense.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit scanned data before confirming
  const handleEditScan = () => {
    setShowScanConfirm(false);
    setShowForm(true);
  };

  // =========================================================================
  // CRUD OPERATIONS
  // =========================================================================
  const resetForm = () => {
    setFormData({
      projectId: selectedProjectId || 0,
      category: "other",
      description: "",
      vendor: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      notes: "",
      receiptUrl: "",
    });
    setScanResult(null);
    setEditingExpense(null);
  };

  const handleAddNew = () => {
    if (!selectedProjectId) {
      Alert.alert("Select a Project", "Please select a project/job first.");
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      projectId: expense.projectId,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor || "",
      amount: expense.amount,
      expenseDate: expense.expenseDate ? expense.expenseDate.split("T")[0] : new Date().toISOString().split("T")[0],
      notes: expense.notes || "",
      receiptUrl: expense.receiptUrl || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.projectId) {
      Alert.alert("Error", "Please select a project.");
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert("Error", "Please enter a description.");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        const res = await apiClient.post("expenses.update", {
          id: editingExpense.id,
          ...formData,
          amount: formData.amount,
          expenseDate: formData.expenseDate,
        });
        if (res.ok) {
          Alert.alert("Success", "Expense updated.");
        } else {
          Alert.alert("Error", res.error || "Failed to update expense.");
          return;
        }
      } else if (scanResult && formData.receiptUrl) {
        const res = await apiClient.post("expenses.createFromScan", {
          projectId: formData.projectId,
          category: formData.category,
          description: formData.description,
          vendor: formData.vendor || undefined,
          amount: formData.amount,
          receiptUrl: formData.receiptUrl,
          expenseDate: formData.expenseDate,
          notes: formData.notes || undefined,
        });
        if (res.ok) {
          Alert.alert("Success", "Expense created from receipt.");
        } else {
          Alert.alert("Error", res.error || "Failed to create expense.");
          return;
        }
      } else {
        const res = await apiClient.post("expenses.create", {
          projectId: formData.projectId,
          category: formData.category,
          description: formData.description,
          vendor: formData.vendor || undefined,
          amount: formData.amount,
          expenseDate: formData.expenseDate,
          notes: formData.notes || undefined,
        });
        if (res.ok) {
          Alert.alert("Success", "Expense recorded.");
        } else {
          Alert.alert("Error", res.error || "Failed to create expense.");
          return;
        }
      }
      setShowForm(false);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiClient.post("expenses.delete", { id });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        Alert.alert("Deleted", "Expense removed.");
      } else {
        Alert.alert("Error", res.error || "Failed to delete expense.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Delete failed.");
    }
    setDeleteConfirmId(null);
  };

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  const getCategoryIcon = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.icon || "receipt-outline";
  const getCategoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseRow}>
        <View style={styles.expenseIconWrap}>
          <Ionicons name={getCategoryIcon(item.category) as any} size={20} color="#3B82F6" />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.expenseMeta}>
            {getCategoryLabel(item.category)} • {item.vendor || "No vendor"} • {formatDate(item.expenseDate)}
          </Text>
          {!selectedProjectId && item.project && (
            <Text style={styles.expenseProject}>{item.project.name || getProjectName(item.projectId)}</Text>
          )}
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
          <View style={styles.actionRow}>
            {item.receiptUrl && (
              <TouchableOpacity onPress={() => setPreviewReceipt(item.receiptUrl!)} style={styles.actionBtn}>
                <Ionicons name="document-attach-outline" size={16} color="#10B981" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
              <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteConfirmId(item.id)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ============ STEP 1: PROJECT SELECTOR (always visible at top) ============ */}
      <View style={styles.projectSelectorWrap}>
        <TouchableOpacity style={styles.projectSelector} onPress={() => setShowProjectSelector(true)}>
          <Ionicons name="business-outline" size={18} color="#3B82F6" />
          <Text style={styles.projectSelectorText} numberOfLines={1}>
            {selectedProjectId ? getProjectName(selectedProjectId) : "Select a Job / Project..."}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#8892A4" />
        </TouchableOpacity>
        {selectedProjectId && (
          <TouchableOpacity style={styles.clearProject} onPress={() => setSelectedProjectId(null)}>
            <Ionicons name="close-circle" size={20} color="#8892A4" />
          </TouchableOpacity>
        )}
      </View>

      {/* ============ STEP 2: ACTION BUTTONS (camera only shows after project selected) ============ */}
      {selectedProjectId && (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanReceipt}>
            <Ionicons name="camera-outline" size={20} color="#FFF" />
            <Text style={styles.scanButtonText}>Scan Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickButton} onPress={handlePickReceipt}>
            <Ionicons name="images-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary bar */}
      {selectedProjectId && filteredExpenses.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.summaryTotal}>Total: {formatCurrency(totalExpenses)}</Text>
        </View>
      )}

      {/* Prompt to select project if none selected */}
      {!selectedProjectId && (
        <View style={styles.promptWrap}>
          <Ionicons name="arrow-up-circle-outline" size={48} color="#3B82F6" />
          <Text style={styles.promptTitle}>Select a Job First</Text>
          <Text style={styles.promptSubtext}>
            Choose a project above to view expenses and scan receipts
          </Text>
        </View>
      )}

      {/* Scanning Overlay */}
      {scanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.scanningText}>Reading receipt with AI...</Text>
          <Text style={styles.scanningSubtext}>Extracting vendor, items, and totals</Text>
        </View>
      )}

      {/* Expenses List (filtered by selected project) */}
      {selectedProjectId && !scanning && (
        filteredExpenses.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="receipt-outline" size={48} color="#5A6A80" />
            <Text style={styles.emptyText}>No expenses for this project</Text>
            <Text style={styles.emptySubtext}>Scan a receipt or add manually</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExpenseItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
            }
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      {/* ============ SCAN CONFIRMATION DIALOG ============ */}
      <Modal visible={showScanConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.scanConfirmBox}>
            <View style={styles.scanConfirmHeader}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={styles.scanConfirmTitle}>Receipt Scanned</Text>
            </View>

            <View style={styles.scanConfirmBody}>
              {/* Project (already selected) */}
              <View style={styles.scanRow}>
                <Text style={styles.scanLabel}>Project</Text>
                <Text style={styles.scanValue}>{getProjectName(formData.projectId)}</Text>
              </View>

              {/* Vendor */}
              {formData.vendor ? (
                <View style={styles.scanRow}>
                  <Text style={styles.scanLabel}>Vendor</Text>
                  <Text style={styles.scanValue}>{formData.vendor}</Text>
                </View>
              ) : null}

              {/* Description */}
              <View style={styles.scanRow}>
                <Text style={styles.scanLabel}>Description</Text>
                <Text style={styles.scanValue} numberOfLines={2}>{formData.description}</Text>
              </View>

              {/* Amount */}
              <View style={styles.scanRow}>
                <Text style={styles.scanLabel}>Amount</Text>
                <Text style={[styles.scanValue, styles.scanAmount]}>${formData.amount}</Text>
              </View>

              {/* Date */}
              <View style={styles.scanRow}>
                <Text style={styles.scanLabel}>Date</Text>
                <Text style={styles.scanValue}>{formData.expenseDate}</Text>
              </View>

              {/* Receipt attached indicator */}
              {formData.receiptUrl ? (
                <View style={styles.scanRow}>
                  <Text style={styles.scanLabel}>Receipt</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="document-attach" size={14} color="#10B981" />
                    <Text style={[styles.scanValue, { color: "#10B981" }]}>Attached ✓</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.scanConfirmActions}>
              <TouchableOpacity style={styles.editScanBtn} onPress={handleEditScan}>
                <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
                <Text style={styles.editScanText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmScanBtn, submitting && { opacity: 0.5 }]}
                onPress={handleConfirmScan}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.confirmScanText}>Confirm & Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelScanBtn}
              onPress={() => { setShowScanConfirm(false); setScanResult(null); }}
            >
              <Text style={styles.cancelScanText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============ PROJECT SELECTOR MODAL ============ */}
      <Modal visible={showProjectSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Job / Project</Text>
            <FlatList
              data={projects.filter((p) => p.status !== "cancelled")}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedProjectId === item.id && styles.pickerItemActive]}
                  onPress={() => { setSelectedProjectId(item.id); setShowProjectSelector(false); }}
                >
                  <Ionicons name="business-outline" size={18} color="#3B82F6" style={{ marginRight: 12 }} />
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                  {selectedProjectId === item.id && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <TouchableOpacity style={styles.pickerClose} onPress={() => setShowProjectSelector(false)}>
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={deleteConfirmId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
            <Text style={styles.confirmTitle}>Delete Expense?</Text>
            <Text style={styles.confirmText}>This action cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirmId(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Preview */}
      <Modal visible={previewReceipt !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.previewBox}>
            <TouchableOpacity style={styles.closePreview} onPress={() => setPreviewReceipt(null)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            {previewReceipt && (
              <Image source={{ uri: previewReceipt }} style={styles.previewImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.formContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={styles.formCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.formTitle}>
              {editingExpense ? "Edit Expense" : scanResult ? "Edit Scanned Data" : "New Expense"}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
              <Text style={[styles.formSave, submitting && { opacity: 0.5 }]}>
                {submitting ? "..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Receipt Image Preview (if scanned) */}
            {formData.receiptUrl ? (
              <View style={styles.receiptPreviewWrap}>
                <Image source={{ uri: formData.receiptUrl }} style={styles.receiptThumb} resizeMode="cover" />
                <View style={styles.receiptBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.receiptBadgeText}>Receipt attached</Text>
                </View>
              </View>
            ) : null}

            {/* Project (locked to selected) */}
            <Text style={styles.fieldLabel}>Project</Text>
            <View style={[styles.pickerButton, { opacity: 0.7 }]}>
              <Ionicons name="business-outline" size={18} color="#3B82F6" />
              <Text style={[styles.pickerText, { marginLeft: 8 }]}>
                {getProjectName(formData.projectId)}
              </Text>
              <Ionicons name="lock-closed-outline" size={14} color="#8892A4" />
            </View>

            {/* Category Picker */}
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCategoryPicker(true)}>
              <Ionicons name={getCategoryIcon(formData.category) as any} size={18} color="#3B82F6" />
              <Text style={[styles.pickerText, { marginLeft: 8 }]}>{getCategoryLabel(formData.category)}</Text>
              <Ionicons name="chevron-down" size={18} color="#8892A4" />
            </TouchableOpacity>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))}
              placeholder="What was purchased?"
              placeholderTextColor="#5A6A80"
            />

            {/* Vendor */}
            <Text style={styles.fieldLabel}>Vendor</Text>
            <TextInput
              style={styles.input}
              value={formData.vendor}
              onChangeText={(t) => setFormData((p) => ({ ...p, vendor: t }))}
              placeholder="Store or supplier name"
              placeholderTextColor="#5A6A80"
            />

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount ($) *</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(t) => setFormData((p) => ({ ...p, amount: t }))}
              placeholder="0.00"
              placeholderTextColor="#5A6A80"
              keyboardType="decimal-pad"
            />

            {/* Date */}
            <Text style={styles.fieldLabel}>Expense Date</Text>
            <TextInput
              style={styles.input}
              value={formData.expenseDate}
              onChangeText={(t) => setFormData((p) => ({ ...p, expenseDate: t }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5A6A80"
            />

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={formData.notes}
              onChangeText={(t) => setFormData((p) => ({ ...p, notes: t }))}
              placeholder="Additional notes..."
              placeholderTextColor="#5A6A80"
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Category</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.pickerItem, formData.category === cat.value && styles.pickerItemActive]}
                onPress={() => { setFormData((p) => ({ ...p, category: cat.value })); setShowCategoryPicker(false); }}
              >
                <Ionicons name={cat.icon as any} size={18} color="#3B82F6" style={{ marginRight: 12 }} />
                <Text style={styles.pickerItemText}>{cat.label}</Text>
                {formData.category === cat.value && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerClose} onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A1628", padding: 24 },
  loadingText: { color: "#8892A4", fontSize: 14, marginTop: 12 },
  emptyText: { color: "#8892A4", fontSize: 16, marginTop: 12, fontWeight: "600" },
  emptySubtext: { color: "#5A6A80", fontSize: 13, marginTop: 4 },

  // Project Selector
  projectSelectorWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  projectSelector: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "#0F1D32", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: "#3B82F6", gap: 8,
  },
  projectSelectorText: { flex: 1, color: "#E2E8F0", fontSize: 15, fontWeight: "600" },
  clearProject: { marginLeft: 8, padding: 4 },

  // Prompt
  promptWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  promptTitle: { color: "#E2E8F0", fontSize: 18, fontWeight: "700", marginTop: 16 },
  promptSubtext: { color: "#8892A4", fontSize: 14, marginTop: 8, textAlign: "center" },

  // Header Actions
  headerActions: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 10, alignItems: "center" },
  scanButton: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#3B82F6", borderRadius: 10, paddingVertical: 12, gap: 8,
  },
  scanButtonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  pickButton: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#1E3A5F",
    alignItems: "center", justifyContent: "center",
  },
  addButton: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#10B981",
    alignItems: "center", justifyContent: "center",
  },

  // Summary bar
  summaryBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16,
    backgroundColor: "#0F1D32", borderRadius: 8, marginBottom: 8,
  },
  summaryText: { color: "#8892A4", fontSize: 13 },
  summaryTotal: { color: "#10B981", fontSize: 14, fontWeight: "700" },

  // Scanning overlay
  scanningOverlay: {
    position: "absolute", top: 140, left: 16, right: 16, zIndex: 100,
    backgroundColor: "#0F1D32", borderRadius: 12, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: "#1A2A40",
  },
  scanningText: { color: "#E2E8F0", fontSize: 15, fontWeight: "600", marginTop: 12 },
  scanningSubtext: { color: "#8892A4", fontSize: 12, marginTop: 4 },

  // Scan Confirmation Dialog
  scanConfirmBox: {
    backgroundColor: "#0F1D32", borderRadius: 16, padding: 24,
    width: SCREEN_WIDTH - 48, borderWidth: 1, borderColor: "#1A2A40",
  },
  scanConfirmHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  scanConfirmTitle: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  scanConfirmBody: { marginBottom: 20 },
  scanRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A2A40" },
  scanLabel: { color: "#8892A4", fontSize: 13, fontWeight: "600" },
  scanValue: { color: "#E2E8F0", fontSize: 14, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  scanAmount: { color: "#10B981", fontSize: 18, fontWeight: "800" },
  scanConfirmActions: { flexDirection: "row", gap: 12 },
  editScanBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#3B82F6", gap: 6,
  },
  editScanText: { color: "#3B82F6", fontSize: 14, fontWeight: "700" },
  confirmScanBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 10, backgroundColor: "#10B981", gap: 6,
  },
  confirmScanText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  cancelScanBtn: { alignItems: "center", marginTop: 12, paddingVertical: 10 },
  cancelScanText: { color: "#8892A4", fontSize: 14 },

  // List
  listContent: { padding: 16, paddingTop: 0 },
  expenseCard: {
    backgroundColor: "#0F1D32", borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#1A2A40",
  },
  expenseRow: { flexDirection: "row", alignItems: "center" },
  expenseIconWrap: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: "#1E3A5F",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  expenseInfo: { flex: 1 },
  expenseDesc: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  expenseMeta: { color: "#8892A4", fontSize: 11, marginTop: 2 },
  expenseProject: { color: "#3B82F6", fontSize: 11, marginTop: 2 },
  expenseRight: { alignItems: "flex-end" },
  expenseAmount: { color: "#10B981", fontSize: 15, fontWeight: "700" },
  actionRow: { flexDirection: "row", marginTop: 6, gap: 8 },
  actionBtn: { padding: 4 },

  // Confirm Delete
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  confirmBox: {
    backgroundColor: "#0F1D32", borderRadius: 16, padding: 24,
    alignItems: "center", width: SCREEN_WIDTH - 64, borderWidth: 1, borderColor: "#1A2A40",
  },
  confirmTitle: { color: "#E2E8F0", fontSize: 18, fontWeight: "700", marginTop: 12 },
  confirmText: { color: "#8892A4", fontSize: 13, marginTop: 8 },
  confirmActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#1E3A5F", alignItems: "center" },
  cancelBtnText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  deleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center" },
  deleteBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // Receipt Preview
  previewBox: {
    width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32, backgroundColor: "#0F1D32",
    borderRadius: 16, overflow: "hidden",
  },
  closePreview: { position: "absolute", top: 12, right: 12, zIndex: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 8 },
  previewImage: { width: "100%", height: "100%" },

  // Form
  formContainer: { flex: 1, backgroundColor: "#0A1628" },
  formHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A2A40",
  },
  formCancel: { color: "#8892A4", fontSize: 15 },
  formTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700" },
  formSave: { color: "#3B82F6", fontSize: 15, fontWeight: "700" },
  formScroll: { flex: 1, padding: 16 },
  fieldLabel: { color: "#8892A4", fontSize: 12, fontWeight: "600", marginTop: 16, marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: "#0F1D32", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: "#E2E8F0", fontSize: 15, borderWidth: 1, borderColor: "#1A2A40",
  },
  pickerButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0F1D32",
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#1A2A40",
  },
  pickerText: { flex: 1, color: "#E2E8F0", fontSize: 15 },

  // Receipt preview in form
  receiptPreviewWrap: { alignItems: "center", marginBottom: 8 },
  receiptThumb: { width: SCREEN_WIDTH - 64, height: 120, borderRadius: 10 },
  receiptBadge: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
  receiptBadgeText: { color: "#10B981", fontSize: 12, fontWeight: "600" },

  // Picker Modal
  pickerModal: {
    backgroundColor: "#0F1D32", borderRadius: 16, padding: 20,
    width: SCREEN_WIDTH - 48, maxHeight: 500, borderWidth: 1, borderColor: "#1A2A40",
  },
  pickerModalTitle: { color: "#E2E8F0", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    paddingHorizontal: 12, borderRadius: 8,
  },
  pickerItemActive: { backgroundColor: "#1E3A5F" },
  pickerItemText: { flex: 1, color: "#E2E8F0", fontSize: 15 },
  pickerClose: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  pickerCloseText: { color: "#8892A4", fontSize: 14 },
});
