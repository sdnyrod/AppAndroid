import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { trpcMutation } from "@/services/api";

const PLANS = [
  { id: "starter", name: "Starter", price: "$97/mo", workers: "Up to 10" },
  { id: "professional", name: "Professional", price: "$197/mo", workers: "Up to 25" },
  { id: "business", name: "Business", price: "$297/mo", workers: "Up to 50" },
  { id: "enterprise", name: "Enterprise", price: "$497/mo", workers: "Unlimited" },
];

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    plan: "starter",
  });

  const handleRegister = async () => {
    if (!form.companyName || !form.ownerName || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await trpcMutation("tenant.register", form);
      if (response.ok) {
        Alert.alert(
          "Welcome to CREW!",
          "Your 14-day free trial has started. No credit card required.",
          [{ text: "Start", onPress: () => navigation.replace("Login") }]
        );
      } else {
        Alert.alert("Error", response.error || "Registration failed");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Start Your Free Trial</Text>
      <Text style={styles.subtitle}>
        14 days free. No credit card required.
      </Text>

      {step === 1 && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Company Name"
            placeholderTextColor="#8892A4"
            value={form.companyName}
            onChangeText={(v) => setForm({ ...form, companyName: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Your Full Name"
            placeholderTextColor="#8892A4"
            value={form.ownerName}
            onChangeText={(v) => setForm({ ...form, ownerName: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8892A4"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor="#8892A4"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8892A4"
            value={form.password}
            onChangeText={(v) => setForm({ ...form, password: v })}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={() => setStep(2)}
          >
            <Text style={styles.buttonText}>Choose Plan</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.planTitle}>Select Your Plan</Text>
          <Text style={styles.planSubtitle}>
            You won't be charged during the trial period.
          </Text>

          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                form.plan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setForm({ ...form, plan: plan.id })}
            >
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planWorkers}>{plan.workers}</Text>
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#8892A4",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#1A2A40",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#2A3A50",
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
  planTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 13,
    color: "#8892A4",
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: "#1A2A40",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A3A50",
  },
  planCardSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1A2A50",
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  planWorkers: {
    fontSize: 13,
    color: "#8892A4",
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  backText: {
    color: "#8892A4",
    textAlign: "center",
    marginTop: 8,
  },
});
