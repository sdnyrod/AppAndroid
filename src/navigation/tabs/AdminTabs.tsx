import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
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
        initialParams={{ title: "Dashboard", role: "admin" }}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Workers"
        component={PlaceholderScreen}
        initialParams={{ title: "Workers", role: "admin" }}
        options={{ tabBarLabel: "Team" }}
      />
      <Tab.Screen
        name="TimeTracking"
        component={PlaceholderScreen}
        initialParams={{ title: "Time Tracking", role: "admin" }}
        options={{ tabBarLabel: "Time" }}
      />
      <Tab.Screen
        name="Jobs"
        component={PlaceholderScreen}
        initialParams={{ title: "Jobs & Estimates", role: "admin" }}
        options={{ tabBarLabel: "Jobs" }}
      />
      <Tab.Screen
        name="More"
        component={PlaceholderScreen}
        initialParams={{ title: "More", role: "admin" }}
        options={{ tabBarLabel: "More" }}
      />
    </Tab.Navigator>
  );
}
