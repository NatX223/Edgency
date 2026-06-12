import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  Platform,
  Easing,
  Vibration,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { StagedImagePreview } from './StagedImagePreview';
import type { AudioRecorderState } from '@/hooks/useAudioRecorder';

export interface StagedImage {
  /** Content URI for display */
  uri: string;
  /** Absolute file-system path for QVAC attachments */
  localPath: string;
}

interface ChatInputBarProps {
  onSend: (text: string, stagedImage?: StagedImage) => void;
  onCameraPress?: () => void;
  onGalleryPress?: () => void;
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
  onCancelSOS?: () => void;
  disabled?: boolean;
  recorderState?: AudioRecorderState;
  /** Staged image waiting to be sent — set externally by camera/gallery handlers */
  stagedImage?: StagedImage | null;
  onDiscardImage?: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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

export function ChatInputBar({
  onSend,
  onCameraPress,
  onGalleryPress,
  onMicPressIn,
  onMicPressOut,
  disabled = false,
  recorderState,
  stagedImage,
  onDiscardImage,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const micScale  = useRef(new Animated.Value(1)).current;
  const micBgAnim = useRef(new Animated.Value(0)).current;

  const isRecording  = recorderState?.isRecording ?? false;
  const hasImage     = Boolean(stagedImage);
  // Can send if: has text OR has image (or both), and not disabled/recording
  const canSend      = !disabled && !isRecording && (text.trim().length > 0 || hasImage);

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
    if (!canSend) return;
    onSend(text.trim(), stagedImage ?? undefined);
    setText('');
    Keyboard.dismiss();
  };

  const handleMicPressIn = () => {
    if (disabled || text.trim() || hasImage) return;
    Vibration.vibrate(30);
    Animated.spring(micScale, { toValue: 1.2, useNativeDriver: true, bounciness: 4 }).start();
    onMicPressIn?.();
  };

  const handleMicPressOut = () => {
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
    onMicPressOut?.();
  };

  const inputPlaceholder = disabled
    ? 'Loading AI model…'
    : hasImage
    ? 'Add a message… (optional)'
    : 'Type a message…';

  return (
    <View style={styles.container}>
      {/* Staged image preview */}
      {stagedImage && (
        <StagedImagePreview uri={stagedImage.uri} onDiscard={onDiscardImage ?? (() => {})} />
      )}

      {/* Recording bar */}
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
      <View style={[
        styles.inputRow,
        disabled && styles.inputRowDisabled,
        isRecording && styles.inputRowRecording,
        hasImage && styles.inputRowWithImage,
      ]}>
        {/* Camera */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onCameraPress}
          activeOpacity={0.7}
          disabled={disabled || isRecording}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.inputIcon, (disabled || isRecording) && styles.dimmed]}>📷</Text>
        </TouchableOpacity>

        {/* Gallery */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onGalleryPress}
          activeOpacity={0.7}
          disabled={disabled || isRecording}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.inputIcon, (disabled || isRecording) && styles.dimmed]}>🖼️</Text>
        </TouchableOpacity>

        {/* Text input */}
        {!isRecording ? (
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={inputPlaceholder}
            placeholderTextColor={Colors.onSurfaceVariant}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline={false}
            editable={!disabled}
            selectionColor={Colors.primaryContainer}
          />
        ) : (
          <View style={styles.recordingSpacer} />
        )}

        {/* Send / mic button */}
        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          {canSend ? (
            // Send arrow — shown when there's text or a staged image
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          ) : (
            // Mic — press and hold
            <TouchableOpacity
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              activeOpacity={1}
              disabled={disabled}
            >
              <Animated.View style={[
                styles.micBtn,
                { backgroundColor: micBg },
                disabled && styles.micBtnDisabled,
              ]}>
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
    backgroundColor: 'rgba(32,31,31,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
    gap: Spacing.xs,
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
  inputRowDisabled:   { opacity: 0.6 },
  inputRowRecording:  { borderColor: 'rgba(255,180,171,0.4)', backgroundColor: 'rgba(147,0,10,0.08)' },
  inputRowWithImage:  { borderColor: 'rgba(255,180,163,0.4)' },

  iconBtn:         { padding: 8 },
  inputIcon:       { fontSize: 18 },
  dimmed:          { opacity: 0.35 },
  recordingSpacer: { flex: 1 },

  input: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    maxHeight: 80,
  },

  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 10,
    elevation: 8,
  },
  sendIcon: { fontSize: 18, color: Colors.onPrimaryContainer, fontWeight: '700' },

  micBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 10,
    elevation: 8,
  },
  micBtnDisabled: { opacity: 0.5 },
  micIcon:        { fontSize: 18 },

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
