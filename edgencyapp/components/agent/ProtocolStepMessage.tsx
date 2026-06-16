import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Share, Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { ProtocolStepData, StepAction } from '@/types/agent';
import type { LogEntry } from '@/hooks/useIncidentLog';

interface ProtocolStepMessageProps extends ProtocolStepData {
  onDone: () => void;
  onCantDo: () => void;
  completed?: boolean;
  logAction?: (entry: Omit<LogEntry, 'id' | 'sessionId' | 'timestamp'>) => Promise<void>;
}

export function ProtocolStepMessage({
  stepNumber, totalSteps, protocolName, instruction,
  checklist, stepActions, timedStep,
  onDone, onCantDo, completed, logAction,
}: ProtocolStepMessageProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const doneScale  = useRef(new Animated.Value(1)).current;

  const [checked, setChecked] = useState<boolean[]>(() => (checklist ?? []).map(() => false));
  const [showOverride, setShowOverride] = useState(false);
  const [triggeredActions, setTriggeredActions] = useState<Set<number>>(new Set());
  const [actionToasts, setActionToasts] = useState<Record<number, string>>({});
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allChecked = checked.every(Boolean);
  const hasChecklist = (checklist ?? []).length > 0;
  const doneEnabled = !hasChecklist || allChecked || showOverride;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity,    { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (hasChecklist && !allChecked && !showOverride) {
      overrideTimerRef.current = setTimeout(() => setShowOverride(true), 10000);
    }
    return () => { if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current); };
  }, [hasChecklist]);

  useEffect(() => {
    if (allChecked && hasChecklist) {
      Animated.sequence([
        Animated.spring(doneScale, { toValue: 1.03, useNativeDriver: true, tension: 120, friction: 4 }),
        Animated.spring(doneScale, { toValue: 1,    useNativeDriver: true, tension: 120, friction: 4 }),
      ]).start();
    }
  }, [allChecked]);

  const toggleCheck = (i: number) => {
    if (completed) return;
    Haptics.selectionAsync();
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logAction?.({ actionType: 'step_done', message: `Step ${stepNumber} confirmed` });
    onDone();
  };

  const handleAction = async (action: StepAction, index: number) => {
    if (triggeredActions.has(index) || completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTriggeredActions(prev => new Set(prev).add(index));

    try {
      if (action.type === 'log_entry') {
        await logAction?.({ actionType: 'log_entry', message: action.logMessage ?? action.label });
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setActionToasts(prev => ({ ...prev, [index]: `🩸 Logged at ${time}` }));
      } else if (action.type === 'broadcast_coordinates') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = pos.coords;
          const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          await Share.share({ message: `📍 Emergency location: ${mapsLink}` });
          await logAction?.({ actionType: 'broadcast_coordinates', message: 'Coordinates shared', lat: latitude, lng: longitude });
          setActionToasts(prev => ({ ...prev, [index]: '📍 Coordinates shared' }));
        }
      } else if (action.type === 'call_number' && action.phoneNumber) {
        await Linking.openURL(`tel:${action.phoneNumber}`);
        setActionToasts(prev => ({ ...prev, [index]: '📞 Calling...' }));
      }
    } catch (e) {
      console.warn('[StepAction] failed:', e);
    }
  };

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      {/* Step header */}
      <View style={styles.header}>
        <Text style={styles.stepLabel}>STEP {stepNumber} OF {totalSteps}</Text>
        <Text style={styles.protocolName}>{protocolName.toUpperCase()}</Text>
      </View>
      <View style={styles.divider} />

      {/* Instruction */}
      <Text style={styles.instruction}>{instruction}</Text>

      {/* Checklist */}
      {hasChecklist && (
        <View style={styles.checklistContainer}>
          {(checklist ?? []).map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.checkRow}
              onPress={() => toggleCheck(i)}
              activeOpacity={0.7}
              disabled={completed}
            >
              <Text style={[styles.checkMark, checked[i] && styles.checkMarkDone]}>
                {checked[i] ? '☑' : '☐'}
              </Text>
              <Text style={[styles.checkLabel, checked[i] && styles.checkLabelDone]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Done / Can't do */}
      {!completed && (
        <View style={styles.actionBtns}>
          <Animated.View style={{ transform: [{ scale: doneScale }], flex: 1 }}>
            <TouchableOpacity
              style={[styles.doneBtn, !doneEnabled && styles.doneBtnDisabled]}
              onPress={handleDone}
              activeOpacity={0.85}
              disabled={!doneEnabled}
            >
              <Text style={styles.doneBtnText}>✓  Done</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.cantDoBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onCantDo(); }} activeOpacity={0.7}>
            <Text style={styles.cantDoBtnText}>✕  Can't do this</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Override */}
      {showOverride && !allChecked && !completed && (
        <TouchableOpacity onPress={handleDone} activeOpacity={0.7}>
          <Text style={styles.overrideText}>Done anyway</Text>
        </TouchableOpacity>
      )}

      {/* Step actions */}
      {(stepActions ?? []).length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.stepActionsContainer}>
            {(stepActions ?? []).map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.stepActionBtn, triggeredActions.has(i) && styles.stepActionBtnDone]}
                onPress={() => handleAction(action, i)}
                activeOpacity={0.8}
                disabled={triggeredActions.has(i)}
              >
                <Text style={styles.stepActionText}>
                  {triggeredActions.has(i) ? `✓  ${actionToasts[i] ?? action.label}` : action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓ Step confirmed</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.default,
    overflow: 'hidden',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel:    { ...Typography.labelSm, color: Colors.primaryContainer, letterSpacing: 1 },
  protocolName: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0.5, flexShrink: 1, textAlign: 'right' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },

  instruction: { ...Typography.bodyMd, color: Colors.onSurface, lineHeight: 22 },

  checklistContainer: { gap: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44, paddingVertical: 4 },
  checkMark:     { fontSize: 18, color: Colors.onSurfaceVariant, width: 24 },
  checkMarkDone: { color: Colors.success },
  checkLabel:     { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  checkLabelDone: { color: Colors.onSurfaceVariant, textDecorationLine: 'line-through', opacity: 0.5 },

  actionBtns: { gap: Spacing.sm },
  doneBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: { opacity: 0.4 },
  doneBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.onPrimaryContainer },

  cantDoBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantDoBtnText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },

  overrideText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 4 },

  stepActionsContainer: { gap: Spacing.xs },
  stepActionBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  stepActionBtnDone: { opacity: 0.5 },
  stepActionText: { ...Typography.labelMd, color: Colors.onSurface },

  completedBadge: { alignItems: 'center', paddingVertical: 4 },
  completedText:  { ...Typography.labelSm, color: Colors.success },
});
