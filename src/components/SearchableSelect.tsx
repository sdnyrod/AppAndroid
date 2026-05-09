import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguageStore } from "@/store/languageStore";

interface SearchableSelectItem {
  id: number;
  name: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  selectedId: number | null;
  onSelect: (item: SearchableSelectItem) => void;
  onClear?: () => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label?: string;
}

/**
 * SearchableSelect — standard reusable search-based selector for the CREW mobile app.
 * Replaces all button-based selectors with a search field + modal list.
 * Pattern matches the web version's search input behavior.
 */
export default function SearchableSelect({
  items,
  selectedId,
  onSelect,
  onClear,
  placeholder = "Search...",
  icon = "search",
  iconColor = "#3B82F6",
  label,
}: SearchableSelectProps) {
  const { t } = useLanguageStore();
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  }, [searchText, items]);

  const handleSelect = (item: SearchableSelectItem) => {
    onSelect(item);
    setShowModal(false);
    setSearchText("");
  };

  return (
    <>
      {/* Trigger Button */}
      <View style={styles.selectorWrap}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
          <Text
            style={[
              styles.selectorText,
              !selectedItem && styles.selectorPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.name : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#5A6A80" />
        </TouchableOpacity>
        {selectedItem && onClear && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
            <Ionicons name="close-circle" size={20} color="#8892A4" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || placeholder}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setSearchText(""); }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={18} color="#8892A4" />
              <TextInput
                style={styles.searchInput}
                placeholder={t("common.typeToSearch")}
                placeholderTextColor="#5A6A80"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Ionicons name="close-circle" size={18} color="#5A6A80" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.resultItem,
                    selectedId === item.id && styles.resultItemActive,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultItemContent}>
                    <Text style={styles.resultItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.resultItemSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {selectedId === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.resultsList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={32} color="#5A6A80" />
                  <Text style={styles.emptyText}>
                    {searchText ? t("common.noResultsFound") : t("common.noItemsAvailable")}
                  </Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Selector trigger
  selectorWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  label: {
    color: "#8892A4",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  selectorText: {
    flex: 1,
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  selectorPlaceholder: {
    color: "#5A6A80",
    fontWeight: "400",
  },
  clearBtn: {
    marginLeft: 8,
    padding: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F1D32",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  // Search input
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2A40",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },

  // Results list
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  resultItemActive: {
    backgroundColor: "#1A2A40",
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemName: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "500",
  },
  resultItemSubtitle: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: "#5A6A80",
    fontSize: 14,
  },
});
