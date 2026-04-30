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
import { usePermissionsStore } from "@/store/permissionsStore";
import { getFilteredMenuGroups } from "./menuConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const { has, hasAny, isOwner, role } = usePermissionsStore();
  const insets = useSafeAreaInsets();

  const menuGroups = getFilteredMenuGroups(has, hasAny);

  const handleNavigate = (screen: string) => {
    navigation.closeDrawer();
    navigation.navigate("MainScreens", { screen });
  };

  const handleLogout = async () => {
    await logout();
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
            <Text style={styles.userRole}>
              {isOwner ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Groups */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {menuGroups.map((group) => (
          <View key={group.id} style={styles.menuGroup}>
            {/* Group header - only show if more than 1 group */}
            {menuGroups.length > 1 && (
              <Text style={styles.groupLabel}>{group.label}</Text>
            )}
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNavigate(item.screen)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color="#8892A4"
                />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
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
