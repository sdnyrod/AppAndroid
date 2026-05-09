import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { usePermissionsStore } from "@/store/permissionsStore";
import { apiClient } from "@/services/api";

import { useLanguageStore } from "@/store/languageStore";
export default function ProfileScreen() {
  const { t } = useLanguageStore();
  const { user, logout } = useAuthStore();
  const { role, isOwner } = usePermissionsStore();

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleLogout = () => {
    Alert.alert(t("auth.signOut"), "Are you sure you want to sign out?", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("auth.signOut"), style: "destructive", onPress: logout },
    ]);
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowCurrentPw(false);
    setShowNewPw(false);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword.trim()) {
      setPasswordError(t("auth.currentPasswordRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordsMismatch"));
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(t("auth.passwordSameAsOld"));
      return;
    }

    setChangingPassword(true);
    try {
      const result = await apiClient.post("auth.changePassword", {
        email: user?.email || "",
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      if (result.ok) {
        setPasswordSuccess(true);
        resetPasswordForm();
        setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(result.error || t("auth.failedChangePassword"));
      }
    } catch (err: any) {
      setPasswordError(err?.message || t("auth.connectionError"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.roleText}>
          {isOwner ? "Owner" : role.charAt(0).toUpperCase() + role.slice(1)}
        </Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <InfoRow icon="mail-outline" label={t("auth.email")} value={user?.email || "—"} />
        <InfoRow icon="call-outline" label={t("profile.phone")} value={user?.phone || "—"} />
        <InfoRow icon="business-outline" label={t("profile.company")} value={user?.tenantName || "—"} />
        <InfoRow icon="globe-outline" label={t("settings.language")} value={(user?.language || "en").toUpperCase()} />
      </View>

      {/* Change Password Section */}
      <View style={styles.passwordSection}>
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => {
            if (showPasswordForm) {
              resetPasswordForm();
            }
            setShowPasswordForm(!showPasswordForm);
          }}
        >
          <Ionicons name="key-outline" size={20} color="#3B82F6" />
          <Text style={styles.changePasswordText}>Change Password</Text>
          <Ionicons
            name={showPasswordForm ? "chevron-up" : "chevron-down"}
            size={18}
            color="#5A6A80"
          />
        </TouchableOpacity>

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            {passwordError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            )}

            {passwordSuccess && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.successText}>Password changed successfully!</Text>
              </View>
            )}

            {/* Current Password */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("auth.currentPassword")}
                placeholderTextColor="#5A6A80"
                secureTextEntry={!showCurrentPw}
                autoCapitalize="none"
                editable={!changingPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                <Ionicons
                  name={showCurrentPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#5A6A80"
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("auth.newPassword")}
                placeholderTextColor="#5A6A80"
                secureTextEntry={!showNewPw}
                autoCapitalize="none"
                editable={!changingPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                <Ionicons
                  name={showNewPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#5A6A80"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("auth.confirmNewPassword")}
                placeholderTextColor="#5A6A80"
                secureTextEntry={!showNewPw}
                autoCapitalize="none"
                editable={!changingPassword}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, changingPassword && styles.submitButtonDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color="#5A6A80" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  content: { padding: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#3B82F6", fontSize: 32, fontWeight: "700" },
  name: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  roleText: { color: "#8892A4", fontSize: 14, marginTop: 4 },
  infoSection: {
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
    gap: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    color: "#5A6A80",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { color: "#E2E8F0", fontSize: 14, marginTop: 2 },

  // Password Section
  passwordSection: {
    backgroundColor: "#0F1D32",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A2A40",
    marginBottom: 24,
    overflow: "hidden",
  },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  changePasswordText: {
    color: "#3B82F6",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  passwordForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2A40",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#2A3A50",
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1017",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  errorText: { color: "#EF4444", fontSize: 12, flex: 1 },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D2818",
    borderWidth: 1,
    borderColor: "#065F46",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  successText: { color: "#10B981", fontSize: 12, flex: 1 },

  // Logout
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#1C1017",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7F1D1D",
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});
