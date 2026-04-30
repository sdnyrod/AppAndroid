import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth";

// Auth Screens
import LoginScreen from "@/screens/auth/LoginScreen";
import RegisterScreen from "@/screens/auth/RegisterScreen";
import TrialExpiredScreen from "@/screens/shared/TrialExpiredScreen";

// Role-based Tab Navigators
import AdminTabs from "./tabs/AdminTabs";
import SupervisorTabs from "./tabs/SupervisorTabs";
import WorkerTabs from "./tabs/WorkerTabs";
import SalespersonTabs from "./tabs/SalespersonTabs";
import DirectorTabs from "./tabs/DirectorTabs";
import OwnerTabs from "./tabs/OwnerTabs";

const Stack = createNativeStackNavigator();

function getRoleNavigator(role: UserRole) {
  switch (role) {
    case "super_owner":
      return OwnerTabs;
    case "admin":
      return AdminTabs;
    case "supervisor":
      return SupervisorTabs;
    case "worker":
      return WorkerTabs;
    case "salesperson":
      return SalespersonTabs;
    case "director":
      return DirectorTabs;
    default:
      return WorkerTabs;
  }
}

/**
 * Check if tenant trial has expired.
 * Trial is expired when:
 * - tenant.status === "trial_expired" OR
 * - tenant.status === "suspended" OR
 * - tenant.trialEndsAt is in the past AND tenant.status === "trial"
 *
 * Salesperson and Director roles are NOT affected by trial expiration
 * (they are part of the sales network, not tenant operations)
 */
function isTrialExpired(user: { role: UserRole; tenantStatus?: string; trialEndsAt?: string }): boolean {
  // Sales network roles are never blocked by trial
  if (user.role === "salesperson" || user.role === "director" || user.role === "super_owner") {
    return false;
  }

  if (user.tenantStatus === "trial_expired" || user.tenantStatus === "suspended") {
    return true;
  }

  if (user.tenantStatus === "trial" && user.trialEndsAt) {
    const trialEnd = new Date(user.trialEndsAt);
    return trialEnd < new Date();
  }

  return false;
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const RoleNavigator = user ? getRoleNavigator(user.role) : null;
  const trialExpired = user ? isTrialExpired(user) : false;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : trialExpired ? (
          <Stack.Screen name="TrialExpired" component={TrialExpiredScreen} />
        ) : (
          <>
            {RoleNavigator && (
              <Stack.Screen name="Main" component={RoleNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1628",
  },
});
