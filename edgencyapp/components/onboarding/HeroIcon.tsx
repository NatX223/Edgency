import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Radii } from '@/constants/tokens';

interface HeroIconProps {
  /** Icon rendered as a child (e.g. SVG or image) */
  children: React.ReactNode;
  size?: number;
}

export function HeroIcon({ children, size = 128 }: HeroIconProps) {
  // Pulsing glow animation
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  // Subtle float animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous pulse on the outer glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle float up/down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 10,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowSize = size * 1.5;

  return (
    <View style={[styles.wrapper, { width: size * 1.8, height: size * 1.8 }]}>
      {/* Diffuse outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            opacity: pulseAnim,
          },
        ]}
      />

      {/* Floating glass container */}
      <Animated.View
        style={[
          styles.glassContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ translateY: floatAnim }],
            // Ambient coral glow shadow
            shadowColor: Colors.primaryContainer,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 32,
            elevation: 20,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    backgroundColor: Colors.primaryContainer,
    opacity: 0.15,
  },
  glassContainer: {
    backgroundColor: 'rgba(32, 31, 31, 0.7)', // surfaceContainer at 70%
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
