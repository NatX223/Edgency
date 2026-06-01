import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface StatusChipProps {
  label: string;
  dot?: boolean;
  dotColor?: string;
}

export function StatusChip({ label, dot = false, dotColor = Colors.success }: StatusChipProps) {
  return (
    <View style={styles.chip}>
      {dot && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dot:   { width: 7, height: 7, borderRadius: 4 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
