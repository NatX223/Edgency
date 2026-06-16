import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { TimerData } from '@/types/agent';

interface InlineTimerMessageProps extends TimerData {
  onComplete: () => void;
  onPause?: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function InlineTimerMessage({ label, durationSeconds, cycleLabel, onComplete, onPause }: InlineTimerMessageProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const [remaining, setRemaining] = useState(durationSeconds);
  const [paused,    setPaused]    = useState(false);
  const [done,      setDone]      = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(durationSeconds);

  useEffect(() => {
    Animated.spring(opacity, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (paused || done) return;
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.timing(progressAnim, {
        toValue: remainingRef.current / durationSeconds,
        duration: 900,
        useNativeDriver: false,
      }).start();

      if (remainingRef.current <= 0) {
        clearInterval(intervalRef.current!);
        setDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, done]);

  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaused(prev => !prev);
    if (!paused) onPause?.();
  };

  const handleDone = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDone(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const isCritical = remaining <= 10 && !done;
  const timeColor = done ? Colors.success : isCritical ? Colors.primaryContainer : Colors.onSurface;

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {cycleLabel && <Text style={styles.cycleLabel}>{cycleLabel}</Text>}
      <Text style={styles.label}>{label}</Text>

      <Text style={[styles.time, { color: timeColor }]}>{done ? 'Done' : formatTime(remaining)}</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: done ? Colors.success : Colors.primaryContainer }]} />
      </View>

      {!done && (
        <View style={styles.btns}>
          <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseResume} activeOpacity={0.7}>
            <Text style={styles.pauseBtnText}>{paused ? '▶  Resume' : '⏸  Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>✓  Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.default,
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  cycleLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1 },
  label:      { ...Typography.bodyMd, color: Colors.onSurface, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  time:       { fontFamily: 'Inter_700Bold', fontSize: 48, letterSpacing: 2 },

  progressTrack: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radii.full, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: Radii.full },

  btns: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  pauseBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radii.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnText: { ...Typography.labelMd, color: Colors.onSurface },
  doneBtn: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.onPrimaryContainer },
});
