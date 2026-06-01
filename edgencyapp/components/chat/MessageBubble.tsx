import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export type MessageSender = 'ai' | 'user';

export interface Message {
  id: string;
  sender: MessageSender;
  text?: string;
  imageUri?: string;
  imageCaption?: string;
  timestamp?: string;
}

interface BubbleProps {
  message: Message;
  animDelay?: number;
}

function AIAvatar() {
  return (
    <View style={av.wrap}>
      <Text style={av.icon}>🤖</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 15 },
});

export function MessageBubble({ message, animDelay = 0 }: BubbleProps) {
  const isUser = message.sender === 'user';

  // Slide + fade entrance
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 380, delay: animDelay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 380, delay: animDelay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAI,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {/* AI avatar — left side only */}
      {!isUser && <AIAvatar />}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
          // Image-only bubble gets tighter padding
          message.imageUri && !message.text ? styles.bubbleImage : null,
        ]}
      >
        {/* Attached image */}
        {message.imageUri && (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: message.imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Caption under image */}
        {message.imageCaption && (
          <Text style={[styles.caption, isUser && styles.captionUser]}>
            {message.imageCaption}
          </Text>
        )}

        {/* Text body */}
        {message.text && (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
            {message.text}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    maxWidth: '85%',
  },
  rowAI:   { alignSelf: 'flex-start' },
  rowUser: { alignSelf: 'flex-end' },

  bubble: {
    borderRadius: Radii.default,
    overflow: 'hidden',
  },
  bubbleAI: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: 'rgba(255,126,95,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.3)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomRightRadius: 4,
    // Subtle coral glow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  bubbleImage: {
    padding: Spacing.xs,
  },

  imageWrap: {
    borderRadius: Radii.default - 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: Radii.default - 2,
  },

  text:     { ...Typography.bodyMd, lineHeight: 22 },
  textAI:   { color: Colors.onSurface },
  textUser: { color: Colors.primary },

  caption:     { ...Typography.labelSm, color: Colors.primary, fontStyle: 'italic', opacity: 0.8, paddingHorizontal: Spacing.xs, paddingBottom: Spacing.xs },
  captionUser: { color: Colors.primaryContainer },
});
