import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export type IncidentType = 'earth' | 'medical' | 'flood' | 'storm';

interface IncidentCardProps {
  title: string;
  example1: string;
  example2: string;
  type: IncidentType;
  onPress?: () => void;
}

const TYPE_CONFIG: Record<IncidentType, { emoji: string; bg: string }> = {
  medical: { emoji: '🏥', bg: 'rgba(255,180,163,0.15)' },
  earth:   { emoji: '⛰️', bg: 'rgba(25,180,163,0.15)' },
  flood:   { emoji: '🌊', bg: 'rgba(193,200,202,0.15)' },
  storm:   { emoji: '🌪️', bg: 'rgba(197,192,255,0.15)' },
};

export function IncidentCard({ title, example1, example2, type, onPress }: IncidentCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const cfg   = TYPE_CONFIG[type];
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, bounciness: 6 }).start();

  const handlePress = () => {
    if (onPress) { onPress(); return; }
    router.push({
      pathname: '/(tabs)/chat',
      params: { type, title, example1, example2 },
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={styles.card} activeOpacity={1} onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Text style={styles.icon}>{cfg.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{example1} • {example2}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  icon:     { fontSize: 20 },
  info:     { flex: 1, gap: 2 },
  title:    { ...Typography.labelMd, color: Colors.onSurface },
  meta:     { ...Typography.bodyMd, color: Colors.onSurfaceVariant, fontSize: 13 },
  chevron:  { fontSize: 24, color: Colors.onSurfaceVariant, lineHeight: 28 },
});
