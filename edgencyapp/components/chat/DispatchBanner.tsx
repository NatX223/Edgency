import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface DispatchBannerProps {
  arrivalMins?: number;
  onViewMap?: () => void;
}

export function DispatchBanner({ arrivalMins = 4, onViewMap }: DispatchBannerProps) {
  const [secsRemaining, setSecsRemaining] = useState(arrivalMins * 60);
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  // Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecsRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulsing glow border
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const mins = Math.floor(secsRemaining / 60);
  const secs = secsRemaining % 60;
  const timeStr = secsRemaining > 0
    ? `Arrival in approx. ${mins}:${String(secs).padStart(2, '0')}`
    : 'Responders have arrived';

  return (
    <Animated.View style={[styles.card, { opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.85, 1] }) }]}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🛡️</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Emergency Dispatched</Text>
          <Text style={styles.sub}>{timeStr}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onViewMap} activeOpacity={0.7}>
        <Text style={styles.mapLink}>View Map</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.default,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.22)',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  left:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconWrap:  {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,126,95,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon:      { fontSize: 18 },
  textBlock: { gap: 2 },
  title:     { ...Typography.labelMd, color: Colors.primaryContainer },
  sub:       { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  mapLink:   { ...Typography.labelSm, color: Colors.primaryContainer, textDecorationLine: 'underline' },
});
