import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { PAYMENT_URL } from "@/constants/config";
import { useAuthStore } from "@/store/authStore";

export default function TrialExpiredScreen() {
  const { logout } = useAuthStore();

  const handleSubscribe = () => {
    // Open payment page in browser (avoids Play Store commission)
    Linking.openURL(PAYMENT_URL);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⏰</Text>
        <Text style={styles.title}>Trial Period Ended</Text>
        <Text style={styles.description}>
          Your 14-day free trial has expired. To continue using CREW, please
          subscribe to a plan.
        </Text>
        <Text style={styles.note}>
          You'll be redirected to our secure payment page in your browser.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
          <Text style={styles.buttonText}>Choose a Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#C9D1D9",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  note: {
    fontSize: 13,
    color: "#8892A4",
    textAlign: "center",
    marginBottom: 32,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  logoutText: {
    color: "#8892A4",
    fontSize: 14,
  },
});
