import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface GlassCardProps {
  children: React.ReactNode;
  tintColor?: string;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: number; // 1-3 for Material Expressive
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Platform-adaptive card component:
 * - iOS: Frosted glass effect with tint color and blur simulation
 * - Android: Material 3 Expressive tonal surface with elevation
 */
export default function GlassCard({
  children,
  tintColor = "#3B82F6",
  style,
  onPress,
  elevation = 1,
}: GlassCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(Platform.OS === "ios" ? 0.97 : 0.95, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  // iOS: Frosted glass with tint
  const iosStyle: ViewStyle = {
    backgroundColor: `${tintColor}12`, // Very subtle tint
    borderWidth: 1,
    borderColor: `${tintColor}30`, // Tinted border
    borderRadius: 20,
    overflow: "hidden",
    // Simulate glass depth with shadow
    shadowColor: tintColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  };

  // Android: Material 3 Expressive tonal surface
  const androidElevationMap: Record<number, ViewStyle> = {
    1: { backgroundColor: `${tintColor}15`, elevation: 2 },
    2: { backgroundColor: `${tintColor}1A`, elevation: 4 },
    3: { backgroundColor: `${tintColor}22`, elevation: 6 },
  };

  const androidStyle: ViewStyle = {
    ...androidElevationMap[elevation] || androidElevationMap[1],
    borderRadius: 24, // Squircle-like
    borderWidth: 0.5,
    borderColor: `${tintColor}20`,
  };

  const platformStyle = Platform.OS === "ios" ? iosStyle : androidStyle;

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[styles.card, platformStyle, style, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* iOS: Top edge highlight for glass refraction effect */}
        {Platform.OS === "ios" && (
          <View
            style={[
              styles.glassHighlight,
              { backgroundColor: `${tintColor}15` },
            ]}
          />
        )}
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View style={[styles.card, platformStyle, style, animatedStyle]}>
      {Platform.OS === "ios" && (
        <View
          style={[
            styles.glassHighlight,
            { backgroundColor: `${tintColor}15` },
          ]}
        />
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
