import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function SalespersonTabs() {
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
        initialParams={{ title: "Sales Dashboard", role: "salesperson" }}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Leads"
        component={PlaceholderScreen}
        initialParams={{ title: "My Leads", role: "salesperson" }}
        options={{ tabBarLabel: "Leads" }}
      />
      <Tab.Screen
        name="Commissions"
        component={PlaceholderScreen}
        initialParams={{ title: "Commissions", role: "salesperson" }}
        options={{ tabBarLabel: "Earnings" }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        initialParams={{ title: "Profile", role: "salesperson" }}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
