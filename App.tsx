import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "@/navigation/AppNavigator";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

function AppContent() {
  // Initialize network monitoring
  useNetworkStatus();

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
