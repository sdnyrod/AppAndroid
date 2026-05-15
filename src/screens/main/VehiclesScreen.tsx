import React from "react";
import { View, Text, StyleSheet } from "react-native";
import GenericScreen from "./GenericScreen";
import { Ionicons } from "@expo/vector-icons";
import { useLanguageStore } from "@/store/languageStore";

export default function VehiclesScreen() {
  const { t } = useLanguageStore();

  const renderVehicleItem = (item: any) => {
    const number = item.internalNumber || "";
    const make = item.make || "";
    const model = item.model || "";
    const year = item.year || "";
    const plate = item.plateNumber || "";
    const type = item.type || "";

    const title = `#${number}${make || model ? " — " + [make, model].filter(Boolean).join(" ") : ""}`;
    const subtitle = [year, type, plate].filter(Boolean).join(" • ");

    return (
      <View style={styles.listItem}>
        <View style={styles.iconContainer}>
          <Ionicons name="car-outline" size={22} color="#3B82F6" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {item.status && (
          <View
            style={[
              styles.badge,
              item.status === "active" ? styles.badgeActive : styles.badgeDefault,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.status === "active"
                ? t("common.active") || "Active"
                : item.status === "inactive"
                ? t("common.inactive") || "Inactive"
                : item.status === "maintenance"
                ? t("fleet.maintenance") || "Maintenance"
                : item.status}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <GenericScreen
      title={t("fleet.vehicles")}
      icon="car-outline"
      procedure="trucks.list"
      emptyMessage={t("fleet.noVehicles")}
      renderItem={renderVehicleItem}
    />
  );
}

const styles = StyleSheet.create({
  listItem: {
    backgroundColor: "#0F1D32",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1A2A40",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    color: "#8892A4",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: "#064E3B",
  },
  badgeDefault: {
    backgroundColor: "#1E3A5F",
  },
  badgeText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
