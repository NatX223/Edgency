import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import type { IncidentType } from '@/components/home/IncidentCard';

interface IncidentContextBannerProps {
  type: IncidentType;
  title: string;
  distance: string;
  address: string;
}

const TYPE_CONFIG: Record<IncidentType, {
  emoji: string;
  label: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
}> = {
  earth: {
    emoji: '⛰️',
    label: 'Earth Quakes',
    accentColor: Colors.error,
    accentBg: 'rgba(25,180,163,0.15)',
    borderColor: 'rgba(25,180,163,0.15)',
  },
  medical: {
    emoji: '🏥',
    label: 'Medical Emergencies',
    accentColor: Colors.tertiary,
    accentBg: 'rgba(255,180,163,0.15)',
    borderColor: 'rgba(255,180,163,0.15)',
  },
  flood: {
    emoji: '🌊',
    label: 'Floods',
    accentColor: Colors.secondary,
    accentBg: 'rgba(193,200,202,0.15)',
    borderColor: 'rgba(193,200,202,0.15)',
  },
  storm: {
    emoji: '🌪️',
    label: 'Storms',
    accentColor: Colors.primary,
    accentBg: 'rgba(197,192,255,0.15)',
    borderColor: 'rgba(197,192,255,0.15)',
  },
};

export function IncidentContextBanner({
  type,
  title,
  distance
}: IncidentContextBannerProps) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.earth;

  // Slide in from top
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cfg.accentBg,
          borderColor: cfg.borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Left: coloured icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.accentBg }]}>
        <Text style={styles.emoji}>{cfg.emoji}</Text>
      </View>

      {/* Centre: incident info */}
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.title}>{distance}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.default,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 22 },

  info:     { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeLabel:{ ...Typography.labelMd, fontSize: 13 },
  typePill: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingVertical: 1,
    paddingHorizontal: 7,
  },
  typeTag:  { ...Typography.labelSm, fontSize: 10 },
  title:    { ...Typography.labelMd, color: Colors.onSurface, fontSize: 18 },
  meta:     { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
