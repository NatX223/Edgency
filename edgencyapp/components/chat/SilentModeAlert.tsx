import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export function SilentModeAlert() {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>🔇</Text>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Silent Mode Recommended</Text>
        <Text style={styles.body}>
          Your device is muted. Please communicate via text if it is not safe to speak.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(159,152,255,0.08)',
    borderRadius: Radii.default,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(159,152,255,0.25)',
  },
  icon:      { fontSize: 20, marginTop: 1 },
  textBlock: { flex: 1, gap: 4 },
  title:     { ...Typography.labelMd, color: Colors.tertiaryContainer },
  body:      { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 21 },
});
