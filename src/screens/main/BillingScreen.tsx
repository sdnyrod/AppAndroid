import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BillingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="card-outline" size={32} color="#3B82F6" />
        <Text style={styles.title}>Billing & Subscription</Text>
      </View>
      <Text style={styles.subtitle}>This feature is available on the web version. Mobile implementation coming soon.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  content: { padding: 24, alignItems: "center", justifyContent: "center", minHeight: 400 },
  header: { alignItems: "center", marginBottom: 16 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginTop: 12 },
  subtitle: { color: "#8892A4", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
