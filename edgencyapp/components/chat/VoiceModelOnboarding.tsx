import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import type { VoiceModelState, VoiceModelStatus } from '@/hooks/useVoiceModels';

interface Props {
  visible: boolean;
  state: VoiceModelState;
  onDownload: () => void;
  onDismiss: () => void;
}

function ProgressBar({ progress, color }: { progress: number | null; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress ?? 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width, backgroundColor: color }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});

function ModelRow({
  label,
  size,
  progress,
  status,
  color,
}: {
  label: string;
  size: string;
  progress: number | null;
  status: VoiceModelStatus;
  color: string;
}) {
  const isDone    = status === 'ready' || (status === 'loading' && progress === null);
  const isLoading = status === 'loading';

  return (
    <View style={mr.row}>
      <View style={mr.header}>
        <Text style={mr.label}>{label}</Text>
        <Text style={mr.meta}>
          {isLoading
            ? 'Loading…'
            : isDone
            ? '✓ Ready'
            : progress != null
            ? `${progress}%`
            : size}
        </Text>
      </View>
      <ProgressBar progress={isDone || isLoading ? 100 : (progress ?? 0)} color={color} />
    </View>
  );
}
const mr = StyleSheet.create({
  row:    { gap: Spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:  { ...Typography.labelSm, color: Colors.onSurface },
  meta:   { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});

function SpinnerIcon() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.Text style={[styles.spinnerIcon, { transform: [{ rotate }] }]}>⟳</Animated.Text>
  );
}

export function VoiceModelOnboarding({ visible, state, onDownload, onDismiss }: Props) {
  const { status, asrProgress, ttsProgress } = state;

  const isIdle       = status === 'idle';
  const isDownloading = status === 'downloading';
  const isLoading    = status === 'loading';
  const isReady      = status === 'ready';
  const isError      = status === 'error';
  const isBusy       = isDownloading || isLoading;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.iconWrap}>
            {isBusy ? (
              <SpinnerIcon />
            ) : isReady ? (
              <Text style={styles.doneIcon}>🎙</Text>
            ) : isError ? (
              <Text style={styles.doneIcon}>⚠️</Text>
            ) : (
              <Text style={styles.doneIcon}>🎙</Text>
            )}
          </View>

          <Text style={styles.title}>
            {isReady
              ? 'Voice Ready'
              : isError
              ? 'Download Failed'
              : isBusy
              ? 'Setting Up Voice'
              : 'Enable Voice Responses'}
          </Text>

          <Text style={styles.body}>
            {isReady
              ? 'Edgent can now hear you and speak back. Hold the mic button to send voice messages.'
              : isError
              ? (state.error ?? 'Something went wrong. Please try again.')
              : isBusy
              ? 'Downloading on-device voice models. This happens once — they stay on your device.'
              : 'Download two small AI models (≈175 MB) so Edgent can transcribe your voice and speak responses back to you.'}
          </Text>

          {/* Progress bars — shown while downloading */}
          {(isDownloading || isLoading) && (
            <View style={styles.progressSection}>
              <ModelRow
                label="Speech Recognition"
                size="43 MB"
                progress={asrProgress}
                status={status}
                color={Colors.primaryContainer}
              />
              <ModelRow
                label="Voice Synthesis"
                size="132 MB"
                progress={ttsProgress}
                status={status}
                color={Colors.tertiary}
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {isReady ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={onDismiss} activeOpacity={0.8}>
                <Text style={styles.btnPrimaryText}>Got it</Text>
              </TouchableOpacity>
            ) : isError ? (
              <>
                <TouchableOpacity style={styles.btnPrimary} onPress={onDownload} activeOpacity={0.8}>
                  <Text style={styles.btnPrimaryText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGhost} onPress={onDismiss} activeOpacity={0.7}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : isBusy ? (
              <TouchableOpacity style={[styles.btnGhost, styles.btnDisabled]} disabled activeOpacity={1}>
                <Text style={styles.btnGhostText}>Downloading…</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.btnPrimary} onPress={onDownload} activeOpacity={0.8}>
                  <Text style={styles.btnPrimaryText}>Download Voice Models</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGhost} onPress={onDismiss} activeOpacity={0.7}>
                  <Text style={styles.btnGhostText}>Not now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },

  iconWrap: { alignItems: 'center', paddingBottom: Spacing.xs },
  doneIcon:    { fontSize: 40 },
  spinnerIcon: { fontSize: 40, color: Colors.primaryContainer },

  title: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  body: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },

  progressSection: { gap: Spacing.md, marginVertical: Spacing.sm },

  actions: { gap: Spacing.sm, marginTop: Spacing.xs },

  btnPrimary: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    ...Typography.labelMd,
    color: Colors.onPrimaryContainer,
  },

  btnGhost: {
    borderRadius: Radii.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnGhostText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
  },
  btnDisabled: { opacity: 0.5 },
});
