import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    login,
    isLoading,
    error,
    clearError,
    mustChangePassword,
    pendingEmail,
    pendingPassword,
    clearMustChangePassword,
  } = useAuthStore();

  // Must change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    await login(email.trim(), password);
  };

  const handleChangePassword = async () => {
    setChangeError(null);

    if (newPassword.length < 8) {
      setChangeError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangeError("Passwords do not match");
      return;
    }
    if (newPassword === (pendingPassword || password)) {
      setChangeError("New password must be different from the temporary password");
      return;
    }

    setChangingPassword(true);
    try {
      const result = await apiClient.post("auth.changePassword", {
        email: pendingEmail || email.trim(),
        currentPassword: pendingPassword || password,
        newPassword: newPassword,
      });

      if (result.ok) {
        // Password changed successfully, now login with new password
        clearMustChangePassword();
        setNewPassword("");
        setConfirmNewPassword("");
        setChangeError(null);
        // Login with the new password
        await login(pendingEmail || email.trim(), newPassword);
      } else {
        setChangeError(result.error || "Failed to change password");
      }
    } catch (err: any) {
      setChangeError(err?.message || "Network error. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Must Change Password Screen
  if (mustChangePassword) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={styles.keyIconWrap}>
                <Ionicons name="key" size={40} color="#F59E0B" />
              </View>
              <Text style={styles.appName}>Change Password</Text>
              <Text style={styles.subtitle}>
                You must change your temporary password before accessing the system.
              </Text>
            </View>

            <View style={styles.form}>
              {changeError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{changeError}</Text>
                </View>
              )}

              {/* New Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New Password (min 8 characters)"
                  placeholderTextColor="#5A6A80"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!changingPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#5A6A80"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#5A6A80"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!changingPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, changingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  clearMustChangePassword();
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setChangeError(null);
                }}
              >
                <Ionicons name="arrow-back" size={16} color="#5A6A80" />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Normal Login Screen
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>CREW</Text>
            <Text style={styles.subtitle}>Construction Workforce Management</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#5A6A80"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#5A6A80"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#5A6A80"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  keyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F59E0B20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#8892A4",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1017",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2A40",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: "#2A3A50",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  backButtonText: {
    color: "#5A6A80",
    fontSize: 14,
  },
});
