import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";
import ProfileScreen from "@/screens/shared/ProfileScreen";

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
        options={{
          tabBarLabel: "Home",
          headerTitle: "Platform Overview",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tenants"
        component={PlaceholderScreen}
        initialParams={{ title: "All Tenants", role: "super_owner" }}
        options={{
          tabBarLabel: "Tenants",
          headerTitle: "All Tenants",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Revenue"
        component={PlaceholderScreen}
        initialParams={{ title: "Platform Revenue", role: "super_owner" }}
        options={{
          tabBarLabel: "Revenue",
          headerTitle: "Platform Revenue",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={PlaceholderScreen}
        initialParams={{ title: "Sales Network", role: "super_owner" }}
        options={{
          tabBarLabel: "Sales",
          headerTitle: "Sales Network",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
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
