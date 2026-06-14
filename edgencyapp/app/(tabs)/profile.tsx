import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { useDatabase, type UserRecord } from '@/hooks/useDatabase';

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const isResponder = role === 'responder';
  return (
    <View style={[s.badge, isResponder ? s.badgeResponder : s.badgeUser]}>
      <Text style={[s.badgeText, isResponder ? s.badgeTextResponder : s.badgeTextUser]}>
        {isResponder ? '🚑 Responder' : '🙋 Civilian'}
      </Text>
    </View>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function TagList({ label, raw }: { label: string; raw?: string | null }) {
  if (!raw?.trim()) return null;
  const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <View style={s.tagSection}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={s.tagRow}>
        {tags.map((t, i) => (
          <View key={i} style={s.tag}>
            <Text style={s.tagText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const EXPERIENCE_LABELS: Record<string, string> = {
  rookie:       'Rookie',
  intermediate: 'Intermediate',
  veteran:      'Veteran',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { isReady, getUser } = useDatabase();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    getUser().then(row => {
      setUser(row);
      setLoading(false);
    });
  }, [isReady]);

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={s.bgGlow} pointerEvents="none" />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.primaryContainer} size="large" />
        </View>
      ) : !user ? (
        <View style={s.centered}>
          <Text style={s.emptyText}>No profile found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {user.full_name.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.headerMeta}>
              <Text style={s.name}>{user.full_name}</Text>
              <Text style={s.sector}>📍 {user.sector}</Text>
              <RoleBadge role={user.role} />
            </View>
          </View>

          {/* Health info */}
          <InfoCard title="Health Information">
            <InfoRow label="Medical history" value={user.medical_history || null} />
            <TagList  label="Conditions & allergies" raw={user.health_conditions} />
            <TagList  label="Disabilities / mobility" raw={user.disabilities} />
            {!user.medical_history && !user.health_conditions && !user.disabilities && (
              <Text style={s.emptySection}>No health information provided.</Text>
            )}
          </InfoCard>

          {/* Responder experience */}
          {user.role === 'responder' && user.experience_level && (
            <InfoCard title="Responder Details">
              <InfoRow
                label="Experience level"
                value={EXPERIENCE_LABELS[user.experience_level] ?? user.experience_level}
              />
            </InfoCard>
          )}

          {/* Privacy note */}
          <View style={s.privacyNote}>
            <Text style={s.privacyIcon}>🔒</Text>
            <Text style={s.privacyText}>
              All profile data is stored only on this device and is never sent to external servers.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  bgGlow: {
    position: 'absolute',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.05,
    top: -80, alignSelf: 'center',
  },

  scroll: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: 64,
    paddingBottom: 48,
    gap: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.headlineMd,
    color: Colors.onPrimaryContainer,
    fontSize: 30,
  },
  headerMeta: { flex: 1, gap: 4 },
  name:   { ...Typography.headlineMd, color: Colors.onSurface },
  sector: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  // Role badge
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginTop: 4,
  },
  badgeResponder:     { backgroundColor: 'rgba(157,152,255,0.15)' },
  badgeUser:          { backgroundColor: 'rgba(255,126,95,0.12)' },
  badgeText:          { ...Typography.labelSm },
  badgeTextResponder: { color: Colors.tertiary },
  badgeTextUser:      { color: Colors.primaryContainer },

  // Cards
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    ...Typography.labelMd,
    color: Colors.primaryContainer,
    marginBottom: 4,
  },

  // Info rows
  infoRow: { gap: 2 },
  infoLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  infoValue: { ...Typography.bodyMd, color: Colors.onSurface },
  emptySection: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontStyle: 'italic' },

  // Tags
  tagSection: { gap: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  tagText: { ...Typography.labelSm, color: Colors.onSurface },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  privacyIcon: { fontSize: 16, flexShrink: 0 },
  privacyText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 17 },
});
