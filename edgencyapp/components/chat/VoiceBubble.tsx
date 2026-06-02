import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface VoiceBubbleProps {
  uri: string;
  durationMs: number;
  /** true = right-aligned coral user style, false = left dark AI style */
  isUser: boolean;
}

// Format ms → "0:12"
function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Fixed bar heights for a natural-looking waveform (16 bars)
const BAR_HEIGHTS = [0.4, 0.7, 0.5, 1.0, 0.6, 0.8, 0.45, 0.9,
                     0.55, 0.75, 0.35, 0.85, 0.6, 0.5, 0.8, 0.4];

export function VoiceBubble({ uri, durationMs, isUser }: VoiceBubbleProps) {
  const [playing,     setPlaying]     = useState(false);
  const [progressMs,  setProgressMs]  = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Waveform bar animations (pulse when playing)
  const barAnims = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;
  const playAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      playAnim.current?.stop();
    };
  }, []);

  const startBarAnimation = () => {
    playAnim.current = Animated.loop(
      Animated.stagger(
        60,
        barAnims.map((anim, i) =>
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.3 + Math.random() * 0.7,
              duration: 250 + i * 20,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: BAR_HEIGHTS[i],
              duration: 250 + i * 20,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        )
      )
    );
    playAnim.current.start();
  };

  const stopBarAnimation = () => {
    playAnim.current?.stop();
    barAnims.forEach((anim, i) =>
      Animated.timing(anim, {
        toValue: BAR_HEIGHTS[i],
        duration: 200,
        useNativeDriver: true,
      }).start()
    );
  };

  const handlePlayPause = async () => {
    if (playing) {
      await soundRef.current?.pauseAsync();
      setPlaying(false);
      stopBarAnimation();
      return;
    }

    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              setProgressMs(status.positionMillis ?? 0);
              if (status.didJustFinish) {
                setPlaying(false);
                setProgressMs(0);
                stopBarAnimation();
              }
            }
          }
        );
        soundRef.current = sound;
      } else {
        await soundRef.current.playAsync();
      }
      setPlaying(true);
      startBarAnimation();
    } catch (e) {
      console.warn('[VoiceBubble] playback error:', e);
    }
  };

  const progress = durationMs > 0 ? progressMs / durationMs : 0;
  const barColor = isUser ? Colors.primaryContainer : Colors.onSurfaceVariant;
  const activeBarColor = isUser ? Colors.primary : Colors.onSurface;

  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
      {/* Play / pause button */}
      <TouchableOpacity style={[styles.playBtn, isUser && styles.playBtnUser]} onPress={handlePlayPause} activeOpacity={0.8}>
        <Text style={[styles.playIcon, isUser && styles.playIconUser]}>
          {playing ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Waveform bars */}
      <View style={styles.waveform}>
        {BAR_HEIGHTS.map((h, i) => {
          const filled = progress > i / BAR_HEIGHTS.length;
          return (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  backgroundColor: filled ? activeBarColor : barColor,
                  opacity: filled ? 1 : 0.45,
                  transform: [{ scaleY: barAnims[i] }],
                  height: 28 * h,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Duration */}
      <Text style={[styles.duration, isUser && styles.durationUser]}>
        {playing ? formatDuration(progressMs) : formatDuration(durationMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.default,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 200,
  },
  bubbleAI: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: 'rgba(255,126,95,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.3)',
    borderBottomRightRadius: 4,
  },

  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnUser: { backgroundColor: 'rgba(255,126,95,0.3)' },
  playIcon:     { fontSize: 14, color: Colors.onSurface },
  playIconUser: { color: Colors.primaryContainer },

  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: 32,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },

  duration:     { ...Typography.labelSm, color: Colors.onSurfaceVariant, minWidth: 32, textAlign: 'right' },
  durationUser: { color: Colors.primaryContainer },
});
