import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { TriageAssessmentData, TriageSeverity } from '@/types/agent';

const TRIAGE_CONFIG: Record<TriageSeverity, {
  label: string;
  color: string;
  icon: string;
  bgColor: string;
  buttonColor: string;
  buttonTextColor: string;
}> = {
  critical: {
    label: 'CRITICAL',
    color: Colors.danger,
    icon: '🔴',
    bgColor: 'rgba(255,68,68,0.10)',
    buttonColor: Colors.danger,
    buttonTextColor: '#ffffff',
  },
  moderate: {
    label: 'MODERATE',
    color: Colors.warning,
    icon: '🟡',
    bgColor: 'rgba(245,166,35,0.10)',
    buttonColor: Colors.warning,
    buttonTextColor: Colors.background,
  },
  stable: {
    label: 'STABLE',
    color: Colors.success,
    icon: '🟢',
    bgColor: 'rgba(0,184,148,0.10)',
    buttonColor: Colors.success,
    buttonTextColor: '#ffffff',
  },
};

interface TriageAssessmentMessageProps extends TriageAssessmentData {
  onStartProtocol: () => void;
}

export function TriageAssessmentMessage({ severity, summary, protocolName, onStartProtocol }: TriageAssessmentMessageProps) {
  const cfg = TRIAGE_CONFIG[severity];

  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const borderAnim  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Haptic on mount
    if (severity === 'critical') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 200, 100, 200]);
    } else if (severity === 'moderate') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Pulsing border for critical only
    if (severity === 'critical') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(borderAnim, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const handleStartProtocol = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onStartProtocol();
  };

  const cardStyle = [
    styles.card,
    { backgroundColor: cfg.bgColor },
  ];

  const borderStyle = severity === 'critical'
    ? { borderColor: cfg.color, borderWidth: 2, opacity: borderAnim }
    : { borderColor: cfg.color, borderWidth: 2 };

  return (
    <Animated.View style={[{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      {severity === 'critical' ? (
        <Animated.View style={[cardStyle, borderStyle]}>
          <TriageContent cfg={cfg} severity={severity} summary={summary} protocolName={protocolName} onPress={handleStartProtocol} />
        </Animated.View>
      ) : (
        <View style={[cardStyle, borderStyle]}>
          <TriageContent cfg={cfg} severity={severity} summary={summary} protocolName={protocolName} onPress={handleStartProtocol} />
        </View>
      )}
    </Animated.View>
  );
}

function TriageContent({
  cfg, severity, summary, protocolName, onPress,
}: {
  cfg: typeof TRIAGE_CONFIG[TriageSeverity];
  severity: TriageSeverity;
  summary: string;
  protocolName: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.inner}>
      <View style={styles.badgeRow}>
        <Text style={styles.icon}>{cfg.icon}</Text>
        <Text style={[styles.badge, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
      <Text style={styles.summary}>{summary}</Text>
      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: cfg.buttonColor }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={[styles.startBtnText, { color: cfg.buttonTextColor }]}>
          Start Protocol →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.default,
    overflow: 'hidden',
  },
  inner: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon:     { fontSize: 22 },
  badge:    { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  summary:  { ...Typography.bodyMd, color: Colors.onSurface, lineHeight: 22 },
  startBtn: {
    height: 52,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
