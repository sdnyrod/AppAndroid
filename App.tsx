import "react-native-reanimated";
import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "@/navigation/AppNavigator";
import ForceUpdateCheck from "@/components/ForceUpdateCheck";
import { useOTAUpdate } from "@/hooks/useOTAUpdate";

export default function App() {
  // Check for OTA updates on app launch and when returning to foreground
  useOTAUpdate();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ForceUpdateCheck>
          <AppNavigator />
        </ForceUpdateCheck>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
