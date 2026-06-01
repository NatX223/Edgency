import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Typography, Radii } from '@/constants/tokens';

export function AIStatusPill() {
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1,   duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.pill}>
      <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
      <Text style={styles.label}>Your always on AI assistant</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(32,31,31,0.88)',
    borderRadius: Radii.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    // subtle coral shadow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  dot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
