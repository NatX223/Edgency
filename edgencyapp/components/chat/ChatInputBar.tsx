import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onCamera?: () => void;
  onVideo?: () => void;
  onCancelSOS?: () => void;
}

export function ChatInputBar({ onSend, onCamera, onVideo, onCancelSOS }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const micScale = useRef(new Animated.Value(1)).current;
  const [micActive, setMicActive] = useState(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  };

  const onMicPressIn = () => {
    setMicActive(true);
    Animated.spring(micScale, { toValue: 1.15, useNativeDriver: true, bounciness: 8 }).start();
  };
  const onMicPressOut = () => {
    setMicActive(false);
    Animated.spring(micScale, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
  };

  return (
    <View style={styles.container}>
      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Camera */}
        <TouchableOpacity style={styles.iconBtn} onPress={onCamera} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.inputIcon}>📷</Text>
        </TouchableOpacity>

        {/* Video */}
        {/* <TouchableOpacity style={styles.iconBtn} onPress={onVideo} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.inputIcon}>🎥</Text>
        </TouchableOpacity> */}

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
          <TouchableOpacity
            style={[styles.micBtn, micActive && styles.micBtnActive]}
            onPressIn={onMicPressIn}
            onPressOut={onMicPressOut}
            onPress={text.trim() ? handleSend : undefined}
            activeOpacity={0.85}
          >
            <Text style={styles.micIcon}>{text.trim() ? '↑' : '🎙'}</Text>
          </TouchableOpacity>
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
  iconBtn:    { padding: 8 },
  inputIcon:  { fontSize: 18 },
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
