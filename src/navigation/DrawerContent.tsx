import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, AppLanguage } from "@/store/languageStore";
import { buildMenuGroups, MenuGroup, getFilteredMenuGroups } from "./menuConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePermissionsStore } from "@/store/permissionsStore";
import { useBrandingStore } from "@/store/brandingStore";

const APP_VERSION = "v1.4.0";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Category Labels ─────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  fieldops: "OPERATIONS",
  projects: "OPERATIONS",
  team: "OPERATIONS",
  jobcosting: "MANAGEMENT",
  fleet: "MANAGEMENT",
  inventory: "MANAGEMENT",
  tools: "MORE",
  referral: "MORE",
  settings: "MORE",
};

// ─── Compact Accordion Group ─────────────────────────────────────────────────
function CompactGroup({
  group,
  isExpanded,
  onToggle,
  onNavigate,
  getGroupLabel,
  getItemLabel,
  primaryColor,
}: {
  group: MenuGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (screen: string) => void;
  getGroupLabel: (id: string) => string;
  getItemLabel: (id: string) => string;
  primaryColor: string;
}) {
  const groupIcon = group.icon as keyof typeof Ionicons.glyphMap;
  return (
    <View>
      <TouchableOpacity
        style={styles.groupRow}
        onPress={onToggle}
        activeOpacity={0.6}
      >
        <Ionicons
          name={groupIcon}
          size={20}
          color={isExpanded ? primaryColor : "#6B7A8D"}
        />
        <Text style={[
          styles.groupLabel,
          isExpanded && { color: "#FFFFFF" },
        ]}>
          {getGroupLabel(group.id)}
        </Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={isExpanded ? primaryColor : "#4A5568"}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.subItems}>
          {group.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.subItem}
              onPress={() => onNavigate(item.screen)}
              activeOpacity={0.6}
            >
              <View style={[styles.subDot, { backgroundColor: `${primaryColor}40` }]} />
              <Text style={styles.subLabel}>{getItemLabel(item.id)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main DrawerContent ──────────────────────────────────────────────────────
export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const { language, setLanguage, labels, t } = useLanguageStore();
  const insets = useSafeAreaInsets();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { has, hasAny, isOwner } = usePermissionsStore();
  const { branding } = useBrandingStore();

  const menuGroups = isOwner ? buildMenuGroups(labels) : getFilteredMenuGroups(labels, has, hasAny);
  const primaryColor = branding?.primaryColor || "#3B82F6";
  const companyName = branding?.name || "CREW";

  const displayRole = (() => {
    const role = user?.role || "employee";
    if (role === "owner" || role === "admin") return t("profile.owner");
    return role.charAt(0).toUpperCase() + role.slice(1);
  })();

  const firstName = user?.name?.split(" ")[0] || "User";

  const handleToggleGroup = useCallback((groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) => {
      if (prev.has(groupId)) return new Set();
      return new Set([groupId]);
    });
  }, []);

  const handleNavigate = (screen: string) => {
    navigation.closeDrawer();
    navigation.navigate("MainScreens", { screen });
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    setLanguage(lang);
  };

  // Map menu group IDs to translated labels
  const getGroupLabel = (groupId: string): string => {
    switch (groupId) {
      case "main": return labels.dashboard;
      case "fieldops": return labels.fieldOperations;
      case "projects": return labels.projects;
      case "team": return labels.team;
      case "jobcosting": return labels.jobCosting;
      case "fleet": return labels.fleet;
      case "inventory": return labels.inventory;
      case "tools": return labels.tools;
      case "referral": return labels.referralProgram;
      case "settings": return labels.settings;
      default: return groupId;
    }
  };

  // Map menu item IDs to translated labels
  const getItemLabel = (itemId: string): string => {
    switch (itemId) {
      case "dashboard": return labels.dashboard;
      case "time-tracking": return labels.timeTracking;
      case "my-hours": return labels.myHours;
      case "active-workers": return labels.activeWorkers;
      case "live-map": return labels.liveMap;
      case "daily-logs": return labels.dailyLogs;
      case "field-media": return labels.fieldMedia;
      case "projects": return labels.projects;
      case "job-schedule": return labels.jobSchedule;
      case "dispatch": return labels.dispatch;
      case "employees": return labels.employees;
      case "payroll": return labels.payroll;
      case "production": return labels.productionPay;
      case "estimates": return labels.estimates;
      case "receivables": return labels.receivables;
      case "expenses": return labels.expenses;
      case "job-cost": return labels.jobCost;
      case "vehicles": return labels.vehicles;
      case "trips": return labels.tripLog;
      case "mileage": return labels.mileageLog;
      case "fleet-cost": return labels.costReport;
      case "catalog": return labels.materialCatalog;
      case "inventory-items": return labels.inventoryItems;
      case "warehouses": return labels.warehouses;
      case "vendors": return labels.vendors;
      case "purchase-orders": return labels.purchaseOrders;
      case "vendor-invoices": return labels.vendorInvoices;
      case "sds-library": return labels.sdsLibrary;
      case "reports": return labels.reports;
      case "location-report": return labels.locationReport;
      case "referrals": return labels.myReferrals;
      case "departments": return labels.departments;
      case "work-types": return labels.workTypes;
      case "classifications": return labels.classifications;
      case "job-roles": return labels.jobRoles;
      case "company-profile": return labels.companyProfile;
      case "billing": return labels.billing;
      case "access-roles": return labels.accessRoles;
      case "admin-panel": return labels.adminPanel;
      default: return itemId;
    }
  };

  // Group the menu groups into categories for section headers
  const filteredGroups = menuGroups.filter((g) => g.id !== "main");
  let lastCategory = "";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandSection}>
            {branding?.logoUrl ? (
              <Image source={{ uri: branding.logoUrl }} style={styles.companyLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: `${primaryColor}25` }]}>
                <Text style={[styles.logoInitial, { color: primaryColor }]}>{companyName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.brandText}>
              <Text style={[styles.companyName, { color: primaryColor }]} numberOfLines={1}>
                {companyName.toUpperCase()}
              </Text>
              <Text style={styles.appVersion}>{APP_VERSION}</Text>
            </View>
          </View>
          {/* Language Flags */}
          <View style={styles.flagsRow}>
            {(["en", "pt", "es"] as AppLanguage[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageChange(lang)}
                activeOpacity={0.6}
                style={[styles.flagDot, language === lang && { borderColor: primaryColor, backgroundColor: `${primaryColor}15` }]}
              >
                <Text style={styles.flagEmoji}>
                  {lang === "en" ? "\u{1F1FA}\u{1F1F8}" : lang === "pt" ? "\u{1F1E7}\u{1F1F7}" : "\u{1F1EA}\u{1F1F8}"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* User Row */}
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => handleNavigate("Profile")}
          activeOpacity={0.6}
        >
          <View style={[styles.avatarCircle, { borderColor: `${primaryColor}50` }]}>
            <Text style={[styles.avatarLetter, { color: primaryColor }]}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userText}>
            <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
            <Text style={styles.userRole}>{displayRole}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#4A5568" />
        </TouchableOpacity>
      </View>

      {/* ── Menu ────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard - Direct Link */}
        <TouchableOpacity
          style={styles.directItem}
          onPress={() => handleNavigate("Dashboard")}
          activeOpacity={0.6}
        >
          <View style={[styles.activeBar, { backgroundColor: primaryColor }]} />
          <Ionicons name="grid-outline" size={20} color={primaryColor} />
          <Text style={[styles.directLabel, { color: primaryColor }]}>{labels.dashboard}</Text>
        </TouchableOpacity>

        {/* CREW Assistant - Normal item, no highlight */}
        {(isOwner || user?.role === 'admin') && (
          <TouchableOpacity
            style={styles.directItem}
            onPress={() => handleNavigate("CrewAssistant")}
            activeOpacity={0.6}
          >
            <View style={styles.activeBarHidden} />
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6B7A8D" />
            <Text style={styles.directLabel}>{labels.crewAssistant || "CREW Assistant"}</Text>
          </TouchableOpacity>
        )}

        {/* Grouped Menu Items */}
        {filteredGroups.map((group) => {
          const category = CATEGORY_MAP[group.id] || "";
          const showCategoryHeader = category !== lastCategory;
          if (showCategoryHeader) lastCategory = category;

          return (
            <View key={group.id}>
              {showCategoryHeader && category && (
                <Text style={styles.categoryLabel}>{category}</Text>
              )}
              <CompactGroup
                group={group}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => handleToggleGroup(group.id)}
                onNavigate={handleNavigate}
                getGroupLabel={getGroupLabel}
                getItemLabel={getItemLabel}
                primaryColor={primaryColor}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutLabel}>{labels.signOut}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1A2A40",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  companyLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  brandText: {
    flex: 1,
  },
  companyName: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  appVersion: {
    fontSize: 9,
    color: "#4A5568",
    marginTop: 1,
  },
  flagsRow: {
    flexDirection: "row",
    gap: 4,
  },
  flagDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  flagEmoji: {
    fontSize: 14,
  },

  // User
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: "700",
  },
  userText: {
    flex: 1,
  },
  userName: {
    color: "#E0E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  userRole: {
    color: "#6B7A8D",
    fontSize: 10,
    marginTop: 1,
  },

  // Menu
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Direct items (Dashboard, Assistant)
  directItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 8,
  },
  activeBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 2,
  },
  activeBarHidden: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 2,
    backgroundColor: "transparent",
  },
  directLabel: {
    color: "#C0C8D4",
    fontSize: 13,
    fontWeight: "600",
  },

  // Category headers
  categoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#4A5568",
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
  },

  // Group rows
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 8,
  },
  groupLabel: {
    flex: 1,
    color: "#8892A4",
    fontSize: 13,
    fontWeight: "600",
  },

  // Sub-items
  subItems: {
    paddingLeft: 42,
    paddingBottom: 4,
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    gap: 8,
  },
  subDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  subLabel: {
    color: "#6B7A8D",
    fontSize: 12,
    fontWeight: "500",
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1A2A40",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    gap: 8,
  },
  logoutLabel: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
  },
});
