import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface QuickActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  primaryColor: string; // Tenant primary for tinting
  onPress: () => void;
}

/**
 * Platform-adaptive quick action button:
 * - iOS: Circular frosted glass button
 * - Android: Pill-shaped Material 3 Expressive button
 */
export default function QuickActionButton({
  label,
  icon,
  color,
  primaryColor,
  onPress,
}: QuickActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  if (Platform.OS === "ios") {
    return (
      <AnimatedTouchable
        style={[styles.iosContainer, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iosCircle,
            {
              backgroundColor: `${primaryColor}12`,
              borderColor: `${primaryColor}30`,
            },
          ]}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.iosLabel}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  // Android: Pill-shaped button
  return (
    <AnimatedTouchable
      style={[
        styles.androidPill,
        {
          backgroundColor: `${primaryColor}15`,
          borderColor: `${primaryColor}20`,
        },
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.androidLabel, { color: "#E0E0E0" }]}>{label}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  // iOS: Circular glass buttons
  iosContainer: {
    alignItems: "center",
    width: 72,
  },
  iosCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  iosLabel: {
    color: "#8892A4",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  // Android: Pill-shaped buttons
  androidPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    gap: 6,
  },
  androidLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
