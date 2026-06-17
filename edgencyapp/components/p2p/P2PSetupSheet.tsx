import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { P2PMode, P2PConfig } from '@/hooks/useP2PConfig';
import type { ProviderStatus } from '@/hooks/useP2PProvider';

interface P2PSetupSheetProps {
  visible: boolean;
  onDismiss: () => void;
  config: P2PConfig;
  setMode: (mode: P2PMode) => Promise<void>;
  setProviderKey: (key: string | null) => Promise<void>;
  providerStatus: ProviderStatus;
  providerPublicKey: string | null;
  providerError: string | null;
  onStartProvider: () => void;
  onStopProvider: () => void;
}

const MODES: { key: P2PMode; label: string; desc: string }[] = [
  { key: 'local',    label: 'Local',    desc: 'Run AI fully on this device' },
  { key: 'consumer', label: 'Consumer', desc: 'Delegate AI to a nearby high-end peer' },
  { key: 'provider', label: 'Provider', desc: 'Serve AI inference to low-end peers' },
];

export function P2PSetupSheet({
  visible,
  onDismiss,
  config,
  setMode,
  setProviderKey,
  providerStatus,
  providerPublicKey,
  providerError,
  onStartProvider,
  onStopProvider,
}: P2PSetupSheetProps) {
  const [draftKey, setDraftKey] = useState(config.providerPublicKey ?? '');

  const handleSaveKey = async () => {
    const trimmed = draftKey.trim();
    await setProviderKey(trimmed || null);
  };

  const handleModeChange = async (mode: P2PMode) => {
    await setMode(mode);
    if (mode !== 'consumer') setDraftKey(config.providerPublicKey ?? '');
  };

  const handleShareKey = async (key: string) => {
    try {
      await Share.share({ message: key, title: 'Edgency P2P Provider Key' });
    } catch {}
  };

  const providerStatusLabel: Record<ProviderStatus, string> = {
    idle:     'Not running',
    starting: 'Starting...',
    running:  'Running',
    stopping: 'Stopping...',
    error:    'Error',
  };

  const providerStatusColor: Record<ProviderStatus, string> = {
    idle:     Colors.onSurfaceVariant,
    starting: Colors.tertiary,
    running:  Colors.success,
    stopping: Colors.tertiary,
    error:    Colors.danger,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>P2P Inference</Text>
              <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Mode selector */}
              <Text style={styles.sectionLabel}>MODE</Text>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeRow, config.mode === m.key && styles.modeRowActive]}
                  onPress={() => handleModeChange(m.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, config.mode === m.key && styles.radioActive]} />
                  <View style={styles.modeTextWrap}>
                    <Text style={[styles.modeLabel, config.mode === m.key && styles.modeLabelActive]}>{m.label}</Text>
                    <Text style={styles.modeDesc}>{m.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Consumer section */}
              {config.mode === 'consumer' && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>PEER PUBLIC KEY</Text>
                  <Text style={styles.hint}>
                    Ask the provider to share their key, then paste it below. The AI runs on their device — yours stays free.
                  </Text>
                  <TextInput
                    style={styles.keyInput}
                    value={draftKey}
                    onChangeText={setDraftKey}
                    placeholder="64-character hex key"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={handleSaveKey}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnText}>Save Key</Text>
                  </TouchableOpacity>
                  {config.providerPublicKey && (
                    <View style={styles.savedKeyRow}>
                      <View style={styles.dot} />
                      <Text style={styles.savedKeyText} numberOfLines={1} ellipsizeMode="middle">
                        Connected to: {config.providerPublicKey}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Provider section */}
              {config.mode === 'provider' && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>PROVIDER SERVICE</Text>
                  <Text style={styles.hint}>
                    Start the provider to let peers delegate AI inference to this device. Share your public key with consumers.
                  </Text>

                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: providerStatusColor[providerStatus] }]} />
                    <Text style={[styles.statusText, { color: providerStatusColor[providerStatus] }]}>
                      {providerStatusLabel[providerStatus]}
                    </Text>
                    {(providerStatus === 'starting' || providerStatus === 'stopping') && (
                      <ActivityIndicator size="small" color={Colors.tertiary} style={{ marginLeft: 8 }} />
                    )}
                  </View>

                  {providerError && (
                    <Text style={styles.errorText}>{providerError}</Text>
                  )}

                  {providerStatus === 'running' && providerPublicKey && (
                    <View style={styles.keyBox}>
                      <Text style={styles.keyBoxLabel}>YOUR PUBLIC KEY</Text>
                      <Text style={styles.keyBoxValue} selectable>{providerPublicKey}</Text>
                      <TouchableOpacity
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => handleShareKey(providerPublicKey)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.btnTextSecondary}>Share Key</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {providerStatus === 'idle' || providerStatus === 'error' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={onStartProvider}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnText}>Start Provider</Text>
                    </TouchableOpacity>
                  ) : providerStatus === 'running' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDanger]}
                      onPress={onStopProvider}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnText}>Stop Provider</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  safeArea: { flex: 0 },
  sheet: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  title:     { ...Typography.labelMd, fontSize: 18, color: Colors.onSurface },
  closeBtn:  { paddingVertical: 4 },
  closeText: { ...Typography.labelMd, color: Colors.primary },

  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  sectionLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: 4,
  },
  modeRowActive: { backgroundColor: Colors.surfaceContainerHigh },

  radio:       { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.outlineVariant, flexShrink: 0 },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },

  modeTextWrap:   { flex: 1 },
  modeLabel:      { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  modeLabelActive:{ color: Colors.onSurface },
  modeDesc:       { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 1 },

  section: { marginTop: Spacing.md },

  hint: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginBottom: Spacing.md, lineHeight: 18 },

  keyInput: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    color: Colors.onSurface,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  btn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnPrimary:   { backgroundColor: Colors.primaryContainer },
  btnSecondary: { backgroundColor: Colors.surfaceContainerHigh, borderWidth: 1, borderColor: Colors.outlineVariant },
  btnDanger:    { backgroundColor: Colors.danger },
  btnText:      { ...Typography.labelMd, color: Colors.onSurface },
  btnTextSecondary: { ...Typography.labelMd, color: Colors.onSurface },

  savedKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.sm,
  },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success, flexShrink: 0 },
  savedKeyText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, flex: 1 },

  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...Typography.labelMd },

  errorText: { ...Typography.labelSm, color: Colors.danger, marginBottom: Spacing.sm },

  keyBox: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.sm,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  keyBoxLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1 },
  keyBoxValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.onSurface,
    lineHeight: 16,
  },
});
