import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as SMS from 'expo-sms';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';

interface SmsSendCardProps {
  address: string;
  message: string;
  sent?: boolean;
  onSent?: () => void;
}

export function SmsSendCard({ address, message, sent: initialSent = false, onSent }: SmsSendCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(initialSent);

  const handleSend = async () => {
    if (sent || sending) return;
    setSending(true);
    try {
      const available = await SMS.isAvailableAsync();
      if (!available) {
        setSending(false);
        return;
      }
      await SMS.sendSMSAsync([address], message);
      setSent(true);
      onSent?.();
    } catch (_) {
      // SMS composer dismissed or failed — don't mark as sent
    } finally {
      setSending(false);
    }
  };

  const preview = message.length > 120 ? message.slice(0, 120) + '…' : message;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📨</Text>
        <Text style={styles.headerTitle}>Send Emergency SMS</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>To</Text>
        <Text style={styles.value}>{address}</Text>

        <Text style={[styles.label, { marginTop: Spacing.sm }]}>Message preview</Text>
        <Text style={styles.preview}>{preview}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, sent && styles.btnSent, sending && styles.btnSending]}
        onPress={handleSend}
        activeOpacity={0.8}
        disabled={sent || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color={Colors.onPrimaryContainer} />
        ) : (
          <Text style={styles.btnText}>{sent ? '✓ Sent' : 'Send SMS'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerHighest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerIcon: { fontSize: 16 },
  headerTitle: {
    ...Typography.labelMd,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 2,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    ...Typography.bodyMd,
    color: Colors.primaryContainer,
    fontWeight: '600',
  },
  preview: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  btn: {
    margin: Spacing.md,
    marginTop: 0,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSent: {
    backgroundColor: Colors.surfaceContainerHighest,
  },
  btnSending: {
    opacity: 0.7,
  },
  btnText: {
    ...Typography.labelMd,
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
