import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export type Role = 'user' | 'responder';

interface RoleOption {
  value: Role;
  emoji: string;
  title: string;
  subtitle: string;
}

const OPTIONS: RoleOption[] = [
  {
    value: 'user',
    emoji: '🙋',
    title: 'I need help',
    subtitle: 'Citizen seeking emergency assistance',
  },
  {
    value: 'responder',
    emoji: '🛡️',
    title: 'I respond',
    subtitle: 'First responder or emergency professional',
  },
];

interface RoleSelectorProps {
  value: Role | null;
  onChange: (role: Role) => void;
}

function RoleCard({
  option,
  selected,
  onPress,
}: {
  option: RoleOption;
  selected: boolean;
  onPress: () => void;
}) {
  const borderAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const bgAnim     = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(bgAnim, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected]);

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(166,139,132,0.2)', Colors.primaryContainer],
  });

  const backgroundColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.surfaceContainerLow, 'rgba(255,126,95,0.1)'],
  });

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, bounciness: 6 }).start();

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.card, { borderColor, backgroundColor }]}>
          {/* Selected indicator */}
          {selected && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}

          <Text style={styles.emoji}>{option.emoji}</Text>
          <Text style={[styles.title, selected && styles.titleSelected]}>
            {option.title}
          </Text>
          <Text style={styles.subtitle}>{option.subtitle}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => (
        <RoleCard
          key={opt.value}
          option={opt}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', gap: Spacing.md },
  cardOuter: { flex: 1 },
  card: {
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    minHeight: 130,
    justifyContent: 'center',
    position: 'relative',
    // Subtle shadow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon:     { fontSize: 11, color: Colors.onPrimaryContainer, fontWeight: '700' },
  emoji:         { fontSize: 32 },
  title:         { ...Typography.labelMd, color: Colors.onSurfaceVariant, textAlign: 'center' },
  titleSelected: { color: Colors.primaryContainer },
  subtitle:      { ...Typography.labelSm, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 16 },
});
