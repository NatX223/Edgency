import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export type ExperienceLevel = 'rookie' | 'intermediate' | 'veteran';

const LEVELS: { value: ExperienceLevel; emoji: string; label: string; sub: string }[] = [
  { value: 'rookie',       emoji: '🌱', label: 'Rookie',       sub: '< 2 years' },
  { value: 'intermediate', emoji: '⚡', label: 'Intermediate', sub: '2–7 years'  },
  { value: 'veteran',      emoji: '🎖️', label: 'Veteran',      sub: '7+ years'   },
];

interface ExperienceSelectorProps {
  value: ExperienceLevel | null;
  onChange: (level: ExperienceLevel) => void;
}

function LevelPill({
  item,
  selected,
  onPress,
}: {
  item: typeof LEVELS[0];
  selected: boolean;
  onPress: () => void;
}) {
  const anim  = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: selected ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [selected]);

  const bg     = anim.interpolate({ inputRange: [0, 1], outputRange: [Colors.surfaceContainerLow, 'rgba(255,126,95,0.18)'] });
  const border = anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(166,139,132,0.2)', Colors.primaryContainer] });

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, bounciness: 6 }).start();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <Animated.View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
          <Text style={styles.sub}>{item.sub}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ExperienceSelector({ value, onChange }: ExperienceSelectorProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Experience level</Text>
      <View style={styles.row}>
        {LEVELS.map((lvl) => (
          <LevelPill
            key={lvl.value}
            item={lvl}
            selected={value === lvl.value}
            onPress={() => onChange(lvl.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  title:   { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  row:     { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    borderWidth: 1.5,
    borderRadius: Radii.default,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    minHeight: 90,
    justifyContent: 'center',
  },
  emoji:         { fontSize: 24 },
  label:         { ...Typography.labelMd, color: Colors.onSurfaceVariant, textAlign: 'center' },
  labelSelected: { color: Colors.primaryContainer },
  sub:           { ...Typography.labelSm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
