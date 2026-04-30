import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PlaceholderScreen from "@/screens/shared/PlaceholderScreen";

const Tab = createBottomTabNavigator();

export default function SupervisorTabs() {
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
        initialParams={{ title: "Team Overview", role: "supervisor" }}
        options={{ tabBarLabel: "Team" }}
      />
      <Tab.Screen
        name="Attendance"
        component={PlaceholderScreen}
        initialParams={{ title: "Attendance", role: "supervisor" }}
        options={{ tabBarLabel: "Attendance" }}
      />
      <Tab.Screen
        name="Dispatch"
        component={PlaceholderScreen}
        initialParams={{ title: "Dispatch", role: "supervisor" }}
        options={{ tabBarLabel: "Dispatch" }}
      />
      <Tab.Screen
        name="Reports"
        component={PlaceholderScreen}
        initialParams={{ title: "Reports", role: "supervisor" }}
        options={{ tabBarLabel: "Reports" }}
      />
      <Tab.Screen
        name="More"
        component={PlaceholderScreen}
        initialParams={{ title: "More", role: "supervisor" }}
        options={{ tabBarLabel: "More" }}
      />
    </Tab.Navigator>
  );
}
