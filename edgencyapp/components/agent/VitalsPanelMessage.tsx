import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { VitalsData, VitalsPanelData } from '@/types/agent';

interface VitalsPanelMessageProps extends VitalsPanelData {
  onConfirm: (vitals: VitalsData) => void;
  locked?: boolean;
}

const BREATHING_OPTIONS = [
  { label: 'Normal',  value: 'normal'  as const },
  { label: 'Labored', value: 'labored' as const },
  { label: 'Absent',  value: 'absent'  as const },
];

const CONSCIOUS_OPTIONS = [
  { label: 'Yes',          value: 'yes'          as const },
  { label: 'No',           value: 'no'           as const },
  { label: 'Unresponsive', value: 'unresponsive' as const },
];

export function VitalsPanelMessage({ fields, onConfirm, locked }: VitalsPanelMessageProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const [pulse,     setPulse]     = useState(72);
  const [breathing, setBreathing] = useState<VitalsData['breathing'] | undefined>();
  const [conscious, setConscious] = useState<VitalsData['conscious'] | undefined>();

  const adjustPulse = (delta: number) => {
    if (locked) return;
    Haptics.selectionAsync();
    setPulse(prev => Math.max(0, Math.min(250, prev + delta)));
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm({
      ...(fields.includes('pulse')     ? { pulse }     : {}),
      ...(fields.includes('breathing') ? { breathing } : {}),
      ...(fields.includes('conscious') ? { conscious } : {}),
    });
  };

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.accent} />
      <Text style={styles.heading}>🫀  Quick vitals check</Text>
      <View style={styles.divider} />

      {fields.includes('pulse') && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Pulse rate</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustPulse(-1)} activeOpacity={0.7} disabled={locked}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.pulseValue}>{pulse}</Text>
            <Text style={styles.bpmLabel}>bpm</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustPulse(1)} activeOpacity={0.7} disabled={locked}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {fields.includes('breathing') && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Breathing</Text>
          <View style={styles.chipRow}>
            {BREATHING_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, breathing === opt.value && styles.chipSelected]}
                onPress={() => { if (!locked) { Haptics.selectionAsync(); setBreathing(opt.value); } }}
                activeOpacity={0.8}
                disabled={locked}
              >
                <Text style={[styles.chipText, breathing === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {fields.includes('conscious') && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Conscious</Text>
          <View style={styles.chipRow}>
            {CONSCIOUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, conscious === opt.value && styles.chipSelected]}
                onPress={() => { if (!locked) { Haptics.selectionAsync(); setConscious(opt.value); } }}
                activeOpacity={0.8}
                disabled={locked}
              >
                <Text style={[styles.chipText, conscious === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!locked && (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Confirm vitals</Text>
        </TouchableOpacity>
      )}
      {locked && (
        <Text style={styles.lockedText}>✓ Vitals recorded</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.default,
    padding: Spacing.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: Colors.tertiary,
  },
  heading:  { ...Typography.bodyMd, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface, paddingLeft: Spacing.xs },
  divider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  field:    { gap: 8 },
  fieldLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },

  stepper:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn:    { backgroundColor: Colors.primaryContainer, borderRadius: Radii.full, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepBtnText:{ fontSize: 20, color: Colors.onPrimaryContainer, fontFamily: 'Inter_700Bold', lineHeight: 22 },
  pulseValue: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.onSurface, minWidth: 48, textAlign: 'center' },
  bpmLabel:   { ...Typography.labelSm, color: Colors.onSurfaceVariant },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    height: 36,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected:     { backgroundColor: Colors.primaryContainer },
  chipText:         { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  chipTextSelected: { color: Colors.onPrimaryContainer, fontFamily: 'Inter_600SemiBold' },

  confirmBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.onPrimaryContainer },
  lockedText:     { ...Typography.labelSm, color: Colors.success, textAlign: 'center', paddingVertical: 4 },
});
