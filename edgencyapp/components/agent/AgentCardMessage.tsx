import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { AgentCardData } from '@/types/agent';

interface AgentCardMessageProps extends AgentCardData {
  onSelect: (value: string) => void;
  disabled?: boolean;
  selectedValue?: string;
}

export function AgentCardMessage({ question, options, icon, onSelect, disabled, selectedValue }: AgentCardMessageProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, useNativeDriver: true, tension: 40, friction: 8 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
    ]).start();
  }, []);

  const primaryOpts  = options.filter(o => o.variant !== 'tertiary');
  const tertiaryOpts = options.filter(o => o.variant === 'tertiary');

  const handlePress = (value: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(value);
  };

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.accent} />
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.question}>{question}</Text>

      <View style={styles.primaryRow}>
        {primaryOpts.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.primaryBtn,
              selectedValue === opt.value && styles.primaryBtnSelected,
              selectedValue && selectedValue !== opt.value && styles.dimmed,
            ]}
            onPress={() => handlePress(opt.value)}
            activeOpacity={0.8}
            disabled={disabled}
          >
            <Text style={styles.primaryBtnText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tertiaryOpts.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.tertiaryBtn,
            selectedValue === opt.value && styles.tertiaryBtnSelected,
            selectedValue && selectedValue !== opt.value && styles.dimmed,
          ]}
          onPress={() => handlePress(opt.value)}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <Text style={styles.tertiaryBtnText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.default,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primaryContainer,
  },
  icon:     { fontSize: 22 },
  question: { ...Typography.bodyLg, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold', paddingLeft: Spacing.xs },

  primaryRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnSelected: { backgroundColor: Colors.primaryContainer },
  primaryBtnText: { ...Typography.labelMd, color: Colors.onPrimaryContainer, fontFamily: 'Inter_700Bold' },

  tertiaryBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  tertiaryBtnSelected: { borderWidth: 1, borderColor: Colors.primaryContainer },
  tertiaryBtnText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },

  dimmed: { opacity: 0.3 },
});
