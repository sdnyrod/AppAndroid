import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function WorkerTabs() {
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
        name="ClockIn"
        component={PlaceholderScreen}
        initialParams={{ title: "Clock In/Out", role: "worker" }}
        options={{ tabBarLabel: "Clock" }}
      />
      <Tab.Screen
        name="Schedule"
        component={PlaceholderScreen}
        initialParams={{ title: "My Schedule", role: "worker" }}
        options={{ tabBarLabel: "Schedule" }}
      />
      <Tab.Screen
        name="Timesheet"
        component={PlaceholderScreen}
        initialParams={{ title: "Timesheet", role: "worker" }}
        options={{ tabBarLabel: "Hours" }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        initialParams={{ title: "Profile", role: "worker" }}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
