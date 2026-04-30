import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0A1628" },
        headerTintColor: "#FFFFFF",
        tabBarStyle: { backgroundColor: "#0F1D32", borderTopColor: "#1A2A40" },
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#8892A4",
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={PlaceholderScreen}
        initialParams={{ title: "Platform Overview", role: "super_owner" }}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Tenants"
        component={PlaceholderScreen}
        initialParams={{ title: "All Tenants", role: "super_owner" }}
        options={{ tabBarLabel: "Tenants" }}
      />
      <Tab.Screen
        name="Revenue"
        component={PlaceholderScreen}
        initialParams={{ title: "Platform Revenue", role: "super_owner" }}
        options={{ tabBarLabel: "Revenue" }}
      />
      <Tab.Screen
        name="Sales"
        component={PlaceholderScreen}
        initialParams={{ title: "Sales Network", role: "super_owner" }}
        options={{ tabBarLabel: "Sales" }}
      />
      <Tab.Screen
        name="Settings"
        component={PlaceholderScreen}
        initialParams={{ title: "Settings", role: "super_owner" }}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}
