import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore, AppLanguage } from "@/store/languageStore";
import { MENU_GROUPS } from "./menuConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const { language, setLanguage, labels } = useLanguageStore();
  const insets = useSafeAreaInsets();

  // DEFINITIVE: Show ALL menu items for ALL authenticated users.
  // Access control is enforced by the BACKEND (returns 403 if no permission).
  const menuGroups = MENU_GROUPS;

  // Display role from user object directly
  const displayRole = (() => {
    const role = user?.role || "employee";
    if (role === "owner" || role === "admin") return "Owner";
    return role.charAt(0).toUpperCase() + role.slice(1);
  })();

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>CREW</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "User"}
            </Text>
            <Text style={styles.userRole}>{displayRole}</Text>
          </View>
        </View>
        {/* Language Flags - FUNCTIONAL */}
        <View style={styles.flagsRow}>
          <FlagButton emoji="🇺🇸" lang="en" currentLang={language} onPress={handleLanguageChange} />
          <FlagButton emoji="🇧🇷" lang="pt" currentLang={language} onPress={handleLanguageChange} />
          <FlagButton emoji="🇪🇸" lang="es" currentLang={language} onPress={handleLanguageChange} />
        </View>
      </View>

      {/* Menu Groups - ALL items shown, backend enforces access */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {menuGroups.map((group) => (
          <View key={group.id} style={styles.menuGroup}>
            <Text style={styles.groupLabel}>
              {getGroupLabel(group.id).toUpperCase()}
            </Text>
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color="#8892A4"
                />
                <Text style={styles.menuItemLabel}>{getItemLabel(item.id)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  userRole: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },
  flagsRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  flagButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 20,
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  menuGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    color: "#5A6A80",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemLabel: {
    color: "#C8D0DC",
    fontSize: 14,
    marginLeft: 12,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A2A40",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
  },
});
