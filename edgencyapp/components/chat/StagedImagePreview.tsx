import React, { useRef, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface StagedImagePreviewProps {
  uri: string;
  onDiscard: () => void;
}

export function StagedImagePreview({ uri, onDiscard }: StagedImagePreviewProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}>
      {/* Attachment label */}
      <View style={styles.labelRow}>
        <Text style={styles.labelIcon}>📎</Text>
        <Text style={styles.labelText}>Photo attached</Text>
        <TouchableOpacity
          onPress={onDiscard}
          style={styles.discardBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={styles.discardIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
        {/* Coral overlay tint to match design system */}
        <View style={styles.thumbOverlay} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.25)',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    gap: 6,
  },
  labelIcon:   { fontSize: 13 },
  labelText:   { ...Typography.labelSm, color: Colors.onSurfaceVariant, flex: 1 },
  discardBtn:  { padding: 4 },
  discardIcon: { fontSize: 13, color: Colors.onSurfaceVariant },

  thumbWrap: { position: 'relative', height: 140 },
  thumb:     { width: '100%', height: '100%' },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,126,95,0.06)',
  },
});
