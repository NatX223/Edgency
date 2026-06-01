import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Easing,
  Vibration,
  Alert,
} from 'react-native';
import { Colors, Typography, Radii } from '@/constants/tokens';

const HOLD_DURATION = 3000;

export function SOSButton() {
  const [holding, setHolding] = useState(false);
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const pressScale   = useRef(new Animated.Value(1)).current;
  const holdAnim     = useRef<Animated.CompositeAnimation | null>(null);

  // Ambient pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1.2,  duration: 1100, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0,    duration: 1100, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.45, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const startHold = () => {
    setHolding(true);
    Vibration.vibrate(40);
    Animated.spring(pressScale, { toValue: 0.93, useNativeDriver: true, bounciness: 2 }).start();
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1, duration: HOLD_DURATION, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        Vibration.vibrate([0, 80, 60, 80]);
        Alert.alert('🚨 SOS Dispatched', 'Emergency services have been notified. Help is on the way.');
        resetHold();
      }
    });
  };

  const resetHold = () => {
    setHolding(false);
    holdAnim.current?.stop();
    Animated.parallel([
      Animated.timing(holdProgress, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.spring(pressScale,   { toValue: 1, useNativeDriver: true, bounciness: 8 }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant:     startHold,
      onPanResponderRelease:   resetHold,
      onPanResponderTerminate: resetHold,
    })
  ).current;

  const btnSize  = 160;
  const ringSize = btnSize + 28;

  return (
    <View style={styles.wrapper}>
      {/* Ambient pulse ring */}
      <Animated.View
        // style={[styles.pulseRing, {
        //   width: ringSize + 20, height: ringSize + 20,
        //   borderRadius: (ringSize + 32) / 2,
        //   transform: [{ scale: pulseScale }],
        //   opacity: pulseOpacity,
        // }]}
      />
      {/* Hold-progress border */}
      {holding && (
        <View style={[styles.progressRing, {
          width: ringSize, height: ringSize, borderRadius: ringSize / 2,
        }]} />
      )}
      {/* SOS Circle */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sosButton, {
          width: btnSize, height: btnSize, borderRadius: btnSize / 2,
          transform: [{ scale: pressScale }],
        }]}
      >
        <Text style={styles.sosEmoji}>🤖</Text>
      </Animated.View>

      <Text style={styles.hint}>
        {holding
          ? 'Keep holding…'
          : 'Edgent is here to help anywhere, anytime completely offline.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:     { alignItems: 'center', justifyContent: 'center', gap: 24, paddingTop: 8 },
  pulseRing:   { position: 'absolute', backgroundColor: Colors.primaryContainer },
  progressRing:{ position: 'absolute', borderWidth: 3, borderColor: Colors.primary, opacity: 0.7 },
  sosButton: {
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,163,0.35)',
  },
  sosEmoji:  { fontSize: 42 },
  sosLabel:  { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.onPrimary, letterSpacing: 3 },
  hint:      { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 260, lineHeight: 22 },
});
