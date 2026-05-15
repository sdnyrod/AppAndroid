import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { useBrandingStore } from "@/store/brandingStore";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

export default function BrandedHeader() {
  const branding = useBrandingStore((s) => s.branding);
  const palette = useBrandingStore((s) => s.palette);
  const user = useAuthStore((s) => s.user);
  const { t } = useLanguageStore();

  const primaryColor = branding?.primaryColor || "#3B82F6";
  const companyName = branding?.name || "CREW";
  const firstName = user?.name?.split(" ")[0] || "";
  const avatarUrl = user?.avatarUrl;

  const hour = new Date().getHours();
  let greetingKey = "dashboard.goodMorning";
  if (hour >= 12 && hour < 18) greetingKey = "dashboard.goodAfternoon";
  else if (hour >= 18) greetingKey = "dashboard.goodEvening";
  const greeting = t(greetingKey) || (
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  );

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateStr = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const containerStyle = Platform.OS === "ios"
    ? [styles.container, styles.iosContainer, { backgroundColor: `${primaryColor}0A` }]
    : [styles.container, styles.androidContainer, { backgroundColor: palette?.surfaceContainer || `${primaryColor}15` }];

  return (
    <View style={containerStyle}>
      <View style={styles.leftSection}>
        {branding?.logoUrl ? (
          <Image source={{ uri: branding.logoUrl }} style={styles.companyLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoPlaceholder, { backgroundColor: `${primaryColor}25` }]}>
            <Text style={[styles.logoInitial, { color: primaryColor }]}>{companyName.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.textSection}>
          <Text style={styles.companyName} numberOfLines={1}>{companyName.toUpperCase()}</Text>
          <Text style={styles.greeting}>
            {greeting}, <Text style={[styles.userName, { color: primaryColor }]}>{firstName}</Text>
          </Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
      </View>
      <View style={[styles.avatarContainer, { borderColor: `${primaryColor}40` }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}25` }]}>
            <Text style={[styles.avatarInitial, { color: primaryColor }]}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  iosContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  androidContainer: {
    borderRadius: 28,
    elevation: 2,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  companyLogo: { width: 40, height: 40, borderRadius: 10 },
  logoPlaceholder: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  logoInitial: { fontSize: 20, fontWeight: "800" },
  textSection: { flex: 1 },
  companyName: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  greeting: { color: "#FFFFFF", fontSize: 14, fontWeight: "500", marginTop: 2 },
  userName: { fontWeight: "700" },
  dateText: { color: "#8892A4", fontSize: 12, marginTop: 2 },
  avatarContainer: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, overflow: "hidden", marginLeft: 12,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 22 },
  avatarPlaceholder: {
    width: "100%", height: "100%", borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  avatarInitial: { fontSize: 18, fontWeight: "700" },
});
