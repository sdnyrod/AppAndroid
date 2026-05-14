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

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FlagButtonProps {
  emoji: string;
  lang: AppLanguage;
  currentLang: AppLanguage;
  onPress: (lang: AppLanguage) => void;
}

function FlagButton({ emoji, lang, currentLang, onPress }: FlagButtonProps) {
  const isActive = lang === currentLang;
  return (
    <TouchableOpacity
      onPress={() => onPress(lang)}
      activeOpacity={0.6}
      style={[
        styles.flagButton,
        isActive && styles.flagButtonActive,
      ]}
    >
      <Text style={styles.flagEmoji}>{emoji}</Text>
    </TouchableOpacity>
  );
}

// Accordion Group Component
function AccordionGroup({
  group,
  isExpanded,
  onToggle,
  onNavigate,
  getGroupLabel,
  getItemLabel,
}: {
  group: MenuGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (screen: string) => void;
  getGroupLabel: (id: string) => string;
  getItemLabel: (id: string) => string;
}) {
  const groupIcon = group.icon as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.accordionGroup}>
      {/* Group Header - Tappable */}
      <TouchableOpacity
        style={[styles.groupHeader, isExpanded && styles.groupHeaderActive]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeaderLeft}>
          <View style={[styles.groupIconContainer, isExpanded && styles.groupIconContainerActive]}>
            <Ionicons
              name={groupIcon}
              size={18}
              color={isExpanded ? "#3B82F6" : "#8892A4"}
            />
          </View>
          <Text style={[styles.groupHeaderText, isExpanded && styles.groupHeaderTextActive]}>
            {getGroupLabel(group.id)}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={isExpanded ? "#3B82F6" : "#5A6A80"}
        />
      </TouchableOpacity>

      {/* Collapsible Items */}
      {isExpanded && (
        <View style={styles.groupItems}>
          {group.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => onNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color="#8892A4"
              />
              <Text style={styles.menuItemLabel}>{getItemLabel(item.id)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const { language, setLanguage, labels, t } = useLanguageStore();
  const insets = useSafeAreaInsets();

  // Track which groups are expanded (start with none expanded for clean look)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { has, hasAny, isOwner } = usePermissionsStore();
  const menuGroups = isOwner ? buildMenuGroups(labels) : getFilteredMenuGroups(labels, has, hasAny);

  const displayRole = (() => {
    const role = user?.role || "employee";
    if (role === "owner" || role === "admin") return t("profile.owner");
    return role.charAt(0).toUpperCase() + role.slice(1);
  })();

  const handleToggleGroup = useCallback((groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) => {
      // If already open, close it
      if (prev.has(groupId)) {
        return new Set();
      }
      // Otherwise, close all others and open only this one (true accordion)
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - Compact */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CREW</Text>
          {/* Language Flags inline with brand */}
          <View style={styles.flagsRow}>
            <FlagButton emoji="🇺🇸" lang="en" currentLang={language} onPress={handleLanguageChange} />
            <FlagButton emoji="🇧🇷" lang="pt" currentLang={language} onPress={handleLanguageChange} />
            <FlagButton emoji="🇪🇸" lang="es" currentLang={language} onPress={handleLanguageChange} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleNavigate("Profile")}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || t("common.user")}
            </Text>
            <Text style={styles.userRole}>{displayRole}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#5A6A80" />
        </TouchableOpacity>
      </View>

      {/* Accordion Menu Groups */}
      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuScrollContent}
      >
        {/* Dashboard - Direct link (no accordion needed for single item) */}
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => handleNavigate("Dashboard")}
          activeOpacity={0.7}
        >
          <View style={styles.groupIconContainer}>
            <Ionicons name="grid-outline" size={18} color="#8892A4" />
          </View>
          <Text style={styles.dashboardLabel}>{labels.dashboard}</Text>
        </TouchableOpacity>

        {/* CREW Assistant - Direct link (prominent placement) */}
        {(isOwner || user?.role === 'admin') && (
          <TouchableOpacity
            style={styles.assistantButton}
            onPress={() => handleNavigate("CrewAssistant")}
            activeOpacity={0.7}
          >
            <View style={[styles.groupIconContainer, styles.assistantIconContainer]}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.assistantLabel}>{labels.crewAssistant}</Text>
          </TouchableOpacity>
        )}

        {/* Separator */}
        <View style={styles.separator} />

        {/* Accordion Groups (skip "main" since Dashboard is direct link) */}
        {menuGroups
          .filter((g) => g.id !== "main")
          .map((group) => (
            <AccordionGroup
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => handleToggleGroup(group.id)}
              onNavigate={handleNavigate}
              getGroupLabel={getGroupLabel}
              getItemLabel={getItemLabel}
            />
          ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{labels.signOut}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    flex: 1,
  },
  flagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  flagButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1A2A40",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  flagButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#1E3A5F",
  },
  flagEmoji: {
    fontSize: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  userRole: {
    color: "#8892A4",
    fontSize: 11,
    marginTop: 1,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#0F1D32",
  },
  dashboardLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },
  assistantButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#1A1708",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#78350F",
  },
  assistantIconContainer: {
    backgroundColor: "#78350F",
  },
  assistantLabel: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: "#1A2A40",
    marginVertical: 10,
    marginHorizontal: 4,
  },
  // Accordion Group Styles
  accordionGroup: {
    marginBottom: 2,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  groupHeaderActive: {
    backgroundColor: "#0F1D32",
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1A2A40",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  groupIconContainerActive: {
    backgroundColor: "#1E3A5F",
  },
  groupHeaderText: {
    color: "#C8D0DC",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  groupHeaderTextActive: {
    color: "#FFFFFF",
  },
  groupItems: {
    paddingLeft: 20,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 22,
  },
  menuItemLabel: {
    color: "#8892A4",
    fontSize: 13,
    marginLeft: 10,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A2A40",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
  },
});
