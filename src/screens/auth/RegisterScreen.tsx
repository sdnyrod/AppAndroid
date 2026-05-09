import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { trpcMutation, apiClient } from "@/services/api";
import { useLanguageStore } from "@/store/languageStore";

interface Plan {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  tagline: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
  maxEmployees: number;
  maxActiveProjects: number;
  trialDays: number;
  isRecommended: boolean;
  badgeText: string | null;
  features: any;
}

export default function RegisterScreen({ navigation }: any) {
  const { t } = useLanguageStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    email: "",
    password: "",
    phone: "",
    plan: "",
    referralCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch plans from API
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await apiClient.get<Plan[]>("subscriptionPlans.list");
      if (data && data.length > 0) {
        setPlans(data);
        // Pre-select recommended plan or first plan
        const recommended = data.find((p) => p.isRecommended);
        setForm((prev) => ({ ...prev, plan: (recommended || data[0]).slug }));
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.companyName.trim()) {
      newErrors.companyName = t("register.companyRequired");
    }
    if (!form.adminName.trim()) {
      newErrors.adminName = t("register.nameRequired");
    }
    if (!form.email.trim()) {
      newErrors.email = t("auth.enterEmail");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t("auth.invalidEmailAddress");
    }
    if (!form.password.trim()) {
      newErrors.password = t("auth.enterPassword");
    } else if (form.password.length < 6) {
      newErrors.password = t("register.passwordMin");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!form.plan) {
      Alert.alert(t("common.error"), t("register.selectPlan"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await trpcMutation("tenants.register", {
        companyName: form.companyName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        plan: form.plan,
        referralCode: form.referralCode.trim() || undefined,
        billingInterval,
      });

      if (response.ok) {
        Alert.alert(
          t("register.welcomeTitle"),
          t("register.welcomeMessage"),
          [{ text: t("register.startNow"), onPress: () => navigation.replace("Login") }]
        );
      } else {
        // Parse tRPC error
        const errorMsg = response.error || t("register.registrationFailed");
        Alert.alert(t("common.error"), errorMsg);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.message || t("auth.connectionError"));
    }
    setIsLoading(false);
  };

  const getPrice = (plan: Plan) => {
    const price = billingInterval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    return `$${price}`;
  };

  const getPeriod = () => {
    return billingInterval === "yearly" ? t("register.perYear") : t("register.perMonth");
  };

  const getWorkersLabel = (max: number) => {
    if (max >= 9999) return t("register.unlimitedWorkers");
    return t("register.upToWorkers", { count: max });
  };

  // =========================================================================
  // STEP 1: Company Info
  // =========================================================================
  const renderStep1 = () => (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="business-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t("register.companyName")}
            placeholderTextColor="#5A6A80"
            value={form.companyName}
            onChangeText={(v) => { setForm({ ...form, companyName: v }); setErrors({ ...errors, companyName: "" }); }}
          />
        </View>
        {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t("register.fullName")}
            placeholderTextColor="#5A6A80"
            value={form.adminName}
            onChangeText={(v) => { setForm({ ...form, adminName: v }); setErrors({ ...errors, adminName: "" }); }}
          />
        </View>
        {errors.adminName ? <Text style={styles.errorText}>{errors.adminName}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t("auth.email")}
            placeholderTextColor="#5A6A80"
            value={form.email}
            onChangeText={(v) => { setForm({ ...form, email: v }); setErrors({ ...errors, email: "" }); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t("register.phone")}
            placeholderTextColor="#5A6A80"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t("auth.password")}
            placeholderTextColor="#5A6A80"
            value={form.password}
            onChangeText={(v) => { setForm({ ...form, password: v }); setErrors({ ...errors, password: "" }); }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#5A6A80" />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWrapper}>
          <Ionicons name="gift-outline" size={18} color="#5A6A80" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t("register.referralCode")}
            placeholderTextColor="#5A6A80"
            value={form.referralCode}
            onChangeText={(v) => setForm({ ...form, referralCode: v })}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>{t("register.choosePlan")}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // =========================================================================
  // STEP 2: Plan Selection
  // =========================================================================
  const renderStep2 = () => (
    <View style={styles.form}>
      <Text style={styles.planTitle}>{t("register.selectPlan")}</Text>
      <Text style={styles.planSubtitle}>{t("register.noCreditCard")}</Text>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, billingInterval === "monthly" && styles.toggleBtnActive]}
          onPress={() => setBillingInterval("monthly")}
        >
          <Text style={[styles.toggleText, billingInterval === "monthly" && styles.toggleTextActive]}>
            {t("register.monthly")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, billingInterval === "yearly" && styles.toggleBtnActive]}
          onPress={() => setBillingInterval("yearly")}
        >
          <Text style={[styles.toggleText, billingInterval === "yearly" && styles.toggleTextActive]}>
            {t("register.yearly")}
          </Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>-20%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loadingPlans ? (
        <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }} />
      ) : (
        plans.map((plan) => (
          <TouchableOpacity
            key={plan.slug}
            style={[styles.planCard, form.plan === plan.slug && styles.planCardSelected]}
            onPress={() => setForm({ ...form, plan: plan.slug })}
          >
            <View style={styles.planCardHeader}>
              <View style={styles.planNameRow}>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{plan.badgeText || t("register.recommended")}</Text>
                  </View>
                )}
              </View>
              {form.plan === plan.slug && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </View>
            <Text style={styles.planDescription}>{plan.tagline || plan.description}</Text>
            <View style={styles.planDetails}>
              <Text style={styles.planPrice}>{getPrice(plan)}<Text style={styles.planPeriod}>{getPeriod()}</Text></Text>
              <Text style={styles.planWorkers}>{getWorkersLabel(plan.maxEmployees)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>{t("register.startTrial")}</Text>
            <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
        <Ionicons name="arrow-back" size={16} color="#5A6A80" />
        <Text style={styles.backText}>{t("auth.backToLogin")}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>CREW</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? t("register.createAccount") : t("register.selectYourPlan")}
          </Text>
        </View>

        {/* Trial Badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
          <Text style={styles.trialBadgeText}>{t("register.trialBadge")}</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>

        {step === 1 ? renderStep1() : renderStep2()}

        {/* Sign In Link */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.signInText}>
            {t("register.alreadyHaveAccount")} <Text style={styles.signInHighlight}>{t("auth.signIn")}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#8892A4",
    marginTop: 4,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 6,
  },
  trialBadgeText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2A3A50",
  },
  stepDotActive: {
    backgroundColor: "#3B82F6",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#2A3A50",
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#3B82F6",
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2A40",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3A50",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  planSubtitle: {
    fontSize: 13,
    color: "#8892A4",
    textAlign: "center",
    marginBottom: 4,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "#1A2A40",
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#3B82F6",
  },
  toggleText: {
    color: "#8892A4",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  saveBadge: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  planCard: {
    backgroundColor: "#1A2A40",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#2A3A50",
  },
  planCardSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1A2A50",
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  recommendedBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    color: "#000000",
    fontSize: 10,
    fontWeight: "700",
  },
  planDescription: {
    fontSize: 13,
    color: "#8892A4",
    marginBottom: 10,
  },
  planDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#3B82F6",
  },
  planPeriod: {
    fontSize: 12,
    fontWeight: "400",
    color: "#5A6A80",
  },
  planWorkers: {
    fontSize: 13,
    color: "#8892A4",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  backText: {
    color: "#5A6A80",
    fontSize: 14,
  },
  signInLink: {
    marginTop: 24,
    alignItems: "center",
  },
  signInText: {
    color: "#5A6A80",
    fontSize: 14,
  },
  signInHighlight: {
    color: "#3B82F6",
    fontWeight: "600",
  },
});
