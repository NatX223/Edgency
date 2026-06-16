import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { AgentState } from '@/types/agent';

interface AgentStatusBarProps {
  agentState: AgentState;
  protocolName?: string;
  currentStep?: number;
  totalSteps?: number;
  onBack: () => void;
}

function dotColor(state: AgentState): string {
  switch (state) {
    case 'assessing':
    case 'triaged':
      return Colors.tertiary;
    case 'active':
    case 'waiting':
      return Colors.primaryContainer;
    case 'stable':
      return Colors.success;
    case 'error':
      return Colors.danger;
  }
}

export function AgentStatusBar({
  agentState,
  protocolName,
  currentStep = 0,
  totalSteps = 0,
  onBack,
}: AgentStatusBarProps) {
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const showProtocol = agentState !== 'assessing' && agentState !== 'triaged' && !!protocolName;
  const showProgress = agentState === 'active' || agentState === 'waiting';
  const progress = totalSteps > 0 ? currentStep / totalSteps : 0;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1,   duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.titleRow}>
          <Animated.View style={[styles.dot, { backgroundColor: dotColor(agentState), opacity: dotOpacity }]} />
          <Text style={styles.label}>EDGENCY AGENT</Text>
          {showProtocol && (
            <Text style={styles.protocolLabel} numberOfLines={1}>
              {'  ·  '}{protocolName}{'  ·  Step '}{currentStep}/{totalSteps}
            </Text>
          )}
        </View>
        {showProgress && (
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19,19,19,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn:   { padding: 8, borderRadius: Radii.full },
  backArrow: { fontSize: 22, color: Colors.onSurface },

  center:   { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot:      { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  label:    { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  protocolLabel: { ...Typography.labelSm, color: Colors.onSurface, flexShrink: 1 },

  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radii.full, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: Radii.full },
});
