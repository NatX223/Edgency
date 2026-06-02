import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface VideoBubbleProps {
  uri: string;
  isUser: boolean;
  /** Duration in ms if available from picker */
  durationMs?: number;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function VideoBubble({ uri, isUser, durationMs }: VideoBubbleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, isUser ? styles.cardUser : styles.cardAI]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        // TODO: plug in expo-video playback when vision model is ready
      >
        {/* Thumbnail area */}
        <View style={styles.thumb}>
          {/* Dark gradient overlay */}
          <View style={styles.thumbOverlay} />

          {/* Play button */}
          <View style={styles.playCircle}>
            <Text style={styles.playIcon}>▶</Text>
          </View>

          {/* Duration badge */}
          {durationMs != null && durationMs > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(durationMs)}</Text>
            </View>
          )}
        </View>

        {/* Caption row */}
        <View style={styles.caption}>
          <Text style={styles.captionIcon}>🎥</Text>
          <Text style={[styles.captionText, isUser && styles.captionTextUser]}>
            Video clip
          </Text>
          <Text style={styles.captionHint}>Tap to play</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const THUMB_H = 160;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.default,
    overflow: 'hidden',
    width: 240,
  },
  cardAI: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderBottomLeftRadius: 4,
  },
  cardUser: {
    backgroundColor: 'rgba(255,126,95,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.3)',
    borderBottomRightRadius: 4,
  },

  thumb: {
    height: THUMB_H,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,126,95,0.75)',
    alignItems: 'center', justifyContent: 'center',
    // Coral glow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  playIcon: { fontSize: 20, color: '#fff', marginLeft: 3 },

  durationBadge: {
    position: 'absolute',
    bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radii.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  durationText: { ...Typography.labelSm, color: '#fff' },

  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  captionIcon:     { fontSize: 14 },
  captionText:     { ...Typography.labelMd, color: Colors.onSurface, flex: 1 },
  captionTextUser: { color: Colors.primaryContainer },
  captionHint:     { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
