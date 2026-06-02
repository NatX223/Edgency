import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Easing,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
  Keyboard,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import type { AudioRecorderState } from '@/hooks/useAudioRecorder';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onCameraPress?: () => void;
  onVideoPress?: () => void;
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
  // onCancelSOS?: () => void;
  disabled?: boolean;
  /** Passed from useAudioRecorder so the bar can show recording state */
  recorderState?: AudioRecorderState;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Animated recording indicator dot
function RecordingDot() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[rd.dot, { opacity }]} />;
}
const rd = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
});


export function ChatInputBar({ onSend, onCameraPress, onMicPressIn, onMicPressOut, recorderState }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const micScale = useRef(new Animated.Value(1)).current;
  const micBgAnim = useRef(new Animated.Value(0)).current;
  const [micActive, setMicActive] = useState(false);

  const isRecording = recorderState?.isRecording ?? false;
  const canSend     = !isRecording && text.trim().length > 0;  

  // Animate mic background when recording
  useEffect(() => {
    Animated.timing(micBgAnim, {
      toValue: isRecording ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isRecording]);

  const micBg = micBgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.primaryContainer, Colors.error],
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const handleMicPressIn = () => {
    if (text.trim()) return;
    Vibration.vibrate(30);
    Animated.spring(micScale, { toValue: 1.2, useNativeDriver: true, bounciness: 4 }).start();
    onMicPressIn?.();
  };

  const handleMicPressOut = () => {
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
    onMicPressOut?.();
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.recordingBar}>
          <RecordingDot />
          <Text style={styles.recordingText}>
            Recording… {formatDuration(recorderState?.durationMs ?? 0)}
          </Text>
          <Text style={styles.recordingHint}>Release to send</Text>
        </View>
      )}
      {/* Input row */}
      <View style={[styles.inputRow, isRecording && styles.inputRowRecording]}>
        {/* Camera */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onCameraPress}
          activeOpacity={0.7}
          disabled={isRecording}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.inputIcon, (isRecording) && styles.dimmed]}>📷</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.onSurfaceVariant}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline={false}
          selectionColor={Colors.primaryContainer}
        />

        {/* Mic / send */}
        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          {/* Send arrow — shown when there's text */}
          {canSend ? (
            <TouchableOpacity style={styles.micBtn} onPress={handleSend} activeOpacity={0.85}>
              <Text style={styles.micIcon}>↑</Text>
            </TouchableOpacity>
          ) : (
            /* Mic — press and hold */
            <TouchableOpacity
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              activeOpacity={1}
            >
              <Animated.View style={[styles.micBtn, { backgroundColor: micBg }]}>
                <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙'}</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131313',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
    gap: Spacing.xs,
    // Coral glow on top edge
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },

  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  recordingText: { ...Typography.labelMd, color: Colors.error, flex: 1 },
  recordingHint: { ...Typography.labelSm, color: Colors.onSurfaceVariant },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(166,139,132,0.2)',
    gap: 4,
  },

  inputRowRecording:  { borderColor: 'rgba(255,180,171,0.4)', backgroundColor: 'rgba(147,0,10,0.08)' },

  iconBtn:    { padding: 8 },
  inputIcon:  { fontSize: 18 },
  dimmed:     { opacity: 0.35 },

  input: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    maxHeight: 80,
  },

  micBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  micBtnActive: {
    backgroundColor: Colors.primary,
    shadowOpacity: 0.7,
  },
  micIcon: { fontSize: 18 },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  cancelIcon: { fontSize: 16, color: Colors.error },
  cancelText: { ...Typography.labelMd, color: Colors.error },
});
