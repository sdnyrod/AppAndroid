import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function DirectorTabs() {
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
        initialParams={{ title: "Director Portal", role: "director" }}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Team"
        component={PlaceholderScreen}
        initialParams={{ title: "Sales Team", role: "director" }}
        options={{ tabBarLabel: "Team" }}
      />
      <Tab.Screen
        name="Revenue"
        component={PlaceholderScreen}
        initialParams={{ title: "Revenue", role: "director" }}
        options={{ tabBarLabel: "Revenue" }}
      />
      <Tab.Screen
        name="Commissions"
        component={PlaceholderScreen}
        initialParams={{ title: "Commissions", role: "director" }}
        options={{ tabBarLabel: "Earnings" }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        initialParams={{ title: "Profile", role: "director" }}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
