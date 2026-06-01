import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface ChatHeaderProps {
  onBack?: () => void;
  onMore?: () => void;
}

export function ChatHeader({ onBack, onMore }: ChatHeaderProps) {
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1,   duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.bar}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Edgent</Text>
      </View>

      {/* More button */}
      {/* <TouchableOpacity
        style={styles.iconBtn}
        onPress={onMore}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.moreIcon}>⋮</Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19,19,19,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: 60,
    gap: Spacing.sm,
  },
  iconBtn:    { padding: 8, borderRadius: Radii.full },
  backArrow:  { fontSize: 22, color: Colors.onSurface },
  moreIcon:   { fontSize: 24, color: Colors.onSurface, lineHeight: 28 },

  titleBlock: { flex: 1, gap: 2 },
  title:      { ...Typography.headlineMd, fontSize: 18, color: Colors.primaryContainer },

  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primaryContainer },
  statusText: { ...Typography.labelSm, color: Colors.primaryContainer },
});
