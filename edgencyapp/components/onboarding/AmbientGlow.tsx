import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Colors } from '@/constants/tokens';

const { width, height } = Dimensions.get('window');
const GLOW_SIZE = Math.min(width * 1.1, 500);

export function AmbientGlow() {
  const opacityAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.14,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.08,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Primary coral glow centered slightly above middle */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            top: height * 0.15,
            left: (width - GLOW_SIZE) / 2,
            opacity: opacityAnim,
          },
        ]}
      />
      {/* Subtle secondary warm radial at bottom */}
      <View
        style={[
          styles.glowSecondary,
          {
            width: GLOW_SIZE * 0.7,
            height: GLOW_SIZE * 0.7,
            borderRadius: (GLOW_SIZE * 0.7) / 2,
            bottom: -GLOW_SIZE * 0.2,
            left: (width - GLOW_SIZE * 0.7) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    backgroundColor: Colors.primaryContainer,
    // React Native doesn't support CSS blur natively; we simulate with layered opacity
    // In a real Expo project, use expo-blur or react-native-blur for true backdrop blur
  },
  glowSecondary: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    opacity: 0.04,
  },
});
