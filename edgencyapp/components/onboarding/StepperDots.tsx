import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radii } from '@/constants/tokens';

interface StepperDotsProps {
  total: number;
  current: number; // 0-indexed
}

export function StepperDots({ total, current }: StepperDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: Radii.full,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.surfaceVariant,
  },
});
