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
import { VoiceBubble } from './VoiceBubble';

import type { AgentCardData, TriageAssessmentData, ProtocolStepData, VitalsPanelData, TimerData } from '@/types/agent';

export type MessageSender = 'ai' | 'user';
export type MessageType = 'text' | 'agent_card' | 'triage_assessment' | 'protocol_step' | 'vitals_panel' | 'inline_timer';

export interface Message {
  id: string;
  sender: MessageSender;
  type?: MessageType;         // undefined treated as 'text'
  text?: string;
  imageUri?: string;
  imageCaption?: string;
  audioUri?: string;
  audioDurationMs?: number;
  videoUri?: string;
  videoDurationMs?: number;
  isStreaming?: boolean;

  // Agent component payloads (stored without callbacks)
  agentCardProps?: AgentCardData;
  triageProps?: TriageAssessmentData;
  protocolStepProps?: ProtocolStepData;
  vitalsPanelProps?: VitalsPanelData;
  timerProps?: TimerData;

  // State flags
  completed?: boolean;
  locked?: boolean;
  selectedValue?: string;     // for agent_card — which option was tapped
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

function StreamCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, easing: Easing.step0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.Text style={[cur.char, { opacity }]}>▋</Animated.Text>;
}
const cur = StyleSheet.create({
  char: { color: Colors.primaryContainer, fontSize: 14, lineHeight: 22 },
});


export function MessageBubble({ message, animDelay = 0 }: BubbleProps) {
  const isUser = message.sender === 'user';

  // Slide + fade entrance
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const didAnimate = useRef(false);

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

  if (message.audioUri) {
    return (
      <Animated.View style={[styles.row, isUser ? styles.rowUser : styles.rowAI, { opacity, transform: [{ translateY }] }]}>
        {!isUser && <AIAvatar />}
        <VoiceBubble uri={message.audioUri} durationMs={message.audioDurationMs ?? 0} isUser={isUser} />
      </Animated.View>
    );
  }

  const hasImage       = Boolean(message.imageUri);
  const hasText        = Boolean(message.text);
  const showCursorOnly = message.isStreaming && !message.text;
  const isCombined     = hasImage && hasText;

  return (
    <Animated.View style={[styles.row, isUser ? styles.rowUser : styles.rowAI, { opacity, transform: [{ translateY }] }]}>
      {!isUser && <AIAvatar />}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>

        {/* ── Image section ── */}
        {hasImage && (
          <View style={[styles.imageWrap, isCombined && styles.imageWrapWithText]}>
            <Image source={{ uri: message.imageUri }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        {/* ── Caption (standalone, no text body) ── */}
        {message.imageCaption && !hasText && (
          <Text style={[styles.caption, isUser && styles.captionUser]}>
            {message.imageCaption}
          </Text>
        )}

        {/* ── Text body + streaming cursor ── */}
        {(hasText || showCursorOnly) && (
          <View style={[styles.textRow, hasImage && styles.textRowAfterImage]}>
            {hasText && (
              <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
                {message.text}
              </Text>
            )}
            {message.isStreaming && <StreamCursor />}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, maxWidth: '85%' },
  rowAI:   { alignSelf: 'flex-start' },
  rowUser: { alignSelf: 'flex-end' },

  bubble: {
    borderRadius: Radii.default,
    overflow: 'hidden',
    // No padding at top-level — image takes full width; text gets own padding below
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
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
  },

  // Image fills bubble width; no border radius so it bleeds to bubble edges
  imageWrap: {
    width: '100%',
  },
  imageWrapWithText: {
    // When combined, image sits flush at top; text below has padding
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  image: {
    width: '100%',
    height: 200,
  },

  caption:     { ...Typography.labelSm, color: Colors.primary, fontStyle: 'italic', opacity: 0.8, padding: Spacing.sm },
  captionUser: { color: Colors.primaryContainer },

  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  // When there's an image above, give text a bit more breathing room
  textRowAfterImage: {
    paddingTop: Spacing.sm,
  },
  text:     { ...Typography.bodyMd, lineHeight: 22, flexShrink: 1 },
  textAI:   { color: Colors.onSurface },
  textUser: { color: Colors.primary },
});
