import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import CommissionsScreen from "@/screens/sales/CommissionsScreen";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";
import ProfileScreen from "@/screens/shared/ProfileScreen";

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
        options={{
          tabBarLabel: "Home",
          headerTitle: "Sales Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leads"
        component={PlaceholderScreen}
        initialParams={{ title: "My Leads", role: "salesperson" }}
        options={{
          tabBarLabel: "Leads",
          headerTitle: "My Leads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Commissions"
        component={CommissionsScreen}
        options={{
          tabBarLabel: "Earnings",
          headerTitle: "Commissions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          headerTitle: "My Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
