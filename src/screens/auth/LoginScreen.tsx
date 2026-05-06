import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/services/api";

// Storage keys
const SAVED_EMAIL_KEY = "crew_saved_email";
const BIOMETRIC_ENABLED_KEY = "crew_biometric_enabled";
const SAVED_CREDENTIALS_KEY = "crew_saved_credentials";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [attemptedBiometric, setAttemptedBiometric] = useState(false);

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

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  useEffect(() => {
    initializeLogin();
  }, []);

  const initializeLogin = async () => {
    // 1. Load saved email
    try {
      const savedEmail = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}

    // 2. Check biometric availability
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Fingerprint");
        }
      }
    } catch {}

    // 3. Check if biometric login is enabled
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      if (enabled === "true") {
        setBiometricEnabled(true);
      }
    } catch {}
  };

  // Auto-attempt biometric login on mount if enabled
  useEffect(() => {
    if (biometricEnabled && biometricAvailable && !attemptedBiometric) {
      setAttemptedBiometric(true);
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricAvailable]);

  // =========================================================================
  // BIOMETRIC LOGIN
  // =========================================================================

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in with ${biometricType}`,
        cancelLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Retrieve saved credentials
        const credentialsJson = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);
        if (credentialsJson) {
          const credentials = JSON.parse(credentialsJson);
          clearError();
          const success = await login(credentials.email, credentials.password);
          if (success) {
            // Save email for next time
            await AsyncStorage.setItem(SAVED_EMAIL_KEY, credentials.email);
          }
        } else {
          Alert.alert(
            "No Saved Credentials",
            "Please sign in with your password first to enable biometric login."
          );
        }
      }
    } catch {
      // User cancelled or biometric failed — do nothing, show password form
    }
  };

  // =========================================================================
  // PASSWORD LOGIN
  // =========================================================================

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();

    const success = await login(email.trim(), password);

    if (success) {
      // Save email for next login
      await AsyncStorage.setItem(SAVED_EMAIL_KEY, email.trim());

      // Save credentials if remember me is on
      if (rememberMe) {
        await SecureStore.setItemAsync(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({ email: email.trim(), password })
        );

        // If biometric is available but not yet enabled, ask user
        if (biometricAvailable && !biometricEnabled) {
          setTimeout(() => {
            promptEnableBiometric();
          }, 1000);
        }
      }
    }
  };

  const promptEnableBiometric = () => {
    Alert.alert(
      `Enable ${biometricType}?`,
      `Would you like to use ${biometricType} for faster sign-in next time?`,
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
            setBiometricEnabled(true);
          },
        },
      ]
    );
  };

  // =========================================================================
  // CHANGE PASSWORD
  // =========================================================================

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
        clearMustChangePassword();
        setNewPassword("");
        setConfirmNewPassword("");
        setChangeError(null);
        // Login with the new password
        const success = await login(pendingEmail || email.trim(), newPassword);
        if (success && rememberMe) {
          await SecureStore.setItemAsync(
            SAVED_CREDENTIALS_KEY,
            JSON.stringify({ email: pendingEmail || email.trim(), password: newPassword })
          );
          await AsyncStorage.setItem(SAVED_EMAIL_KEY, pendingEmail || email.trim());
        }
      } else {
        setChangeError(result.error || "Failed to change password");
      }
    } catch (err: any) {
      setChangeError(err?.message || "Network error. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // =========================================================================
  // RENDER: MUST CHANGE PASSWORD
  // =========================================================================

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

  // =========================================================================
  // RENDER: NORMAL LOGIN
  // =========================================================================

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

            {/* Email */}
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

            {/* Password */}
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

            {/* Remember Me */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberToggle}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
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

            {/* Biometric Login Button */}
            {biometricEnabled && biometricAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={biometricType === "Face ID" ? "scan-outline" : "finger-print-outline"}
                  size={22}
                  color="#3B82F6"
                />
                <Text style={styles.biometricButtonText}>Sign in with {biometricType}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rememberToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#5A6A80",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  rememberText: {
    color: "#8892A4",
    fontSize: 14,
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
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3B82F6",
    backgroundColor: "transparent",
  },
  biometricButtonText: {
    color: "#3B82F6",
    fontSize: 15,
    fontWeight: "500",
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
