import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useAuthStore } from "@/store/authStore";
import { usePermissionsStore } from "@/store/permissionsStore";
import { useLanguageStore } from "@/store/languageStore";
import { useNotificationStore } from "@/store/notificationStore";

// Auth Screens
import LoginScreen from "@/screens/auth/LoginScreen";
import RegisterScreen from "@/screens/auth/RegisterScreen";

// Main App with Drawer
import DrawerContent from "./DrawerContent";
import MainScreens from "./MainScreens";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0A1628",
          width: 300,
        },
        swipeEdgeWidth: 50,
        swipeMinDistance: 10,
      }}
    >
      <Drawer.Screen name="MainScreens" component={MainScreens} />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const { fetchPermissions, reset: resetPermissions } = usePermissionsStore();
  const { loadLanguage } = useLanguageStore();

  useEffect(() => {
    checkAuth();
    loadLanguage();
  }, []);

  const { initializePushNotifications, cleanup: cleanupNotifications } = useNotificationStore();

  // Fetch permissions and init push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPermissions();
      initializePushNotifications();
    } else {
      resetPermissions();
      cleanupNotifications();
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="App" component={AppDrawer} />
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
