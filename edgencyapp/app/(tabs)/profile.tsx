import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { useDatabase, type UserRecord, type ChatSession } from '@/hooks/useDatabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INCIDENT_META: Record<string, { emoji: string; label: string }> = {
  medical: { emoji: '🏥', label: 'Medical' },
  earth:   { emoji: '⛰️', label: 'Earthquake' },
  flood:   { emoji: '🌊', label: 'Flood' },
  storm:   { emoji: '🌪️', label: 'Storm' },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

function lastMessagePreview(session: ChatSession): string {
  try {
    const msgs = JSON.parse(session.messages_json) as Array<{ text?: string; sender: string }>;
    const last = [...msgs].reverse().find(m => m.text?.trim());
    return last?.text?.trim().slice(0, 90) ?? '';
  } catch {
    return '';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function SessionCard({ session, onPress }: { session: ChatSession; onPress: () => void }) {
  const meta    = INCIDENT_META[session.incident_type ?? ''];
  const emoji   = meta?.emoji ?? '💬';
  const label   = session.incident_title ?? meta?.label ?? 'General Chat';
  const preview = lastMessagePreview(session);

  return (
    <TouchableOpacity style={s.sessionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.sessionIconWrap, { backgroundColor: incidentBg(session.incident_type) }]}>
        <Text style={s.sessionEmoji}>{emoji}</Text>
      </View>

      <View style={s.sessionBody}>
        <Text style={s.sessionLabel} numberOfLines={1}>{label}</Text>
        {preview ? (
          <Text style={s.sessionPreview} numberOfLines={2}>{preview}</Text>
        ) : null}
        <Text style={s.sessionDate}>{formatDate(session.updated_at)}</Text>
      </View>

      <Text style={s.sessionChevron}>›</Text>
    </TouchableOpacity>
  );
}

function incidentBg(type: string | null): string {
  switch (type) {
    case 'medical': return 'rgba(255,180,163,0.15)';
    case 'earth':   return 'rgba(25,180,163,0.15)';
    case 'flood':   return 'rgba(193,200,202,0.15)';
    case 'storm':   return 'rgba(197,192,255,0.15)';
    default:        return 'rgba(255,255,255,0.08)';
  }
}

const EXPERIENCE_LABELS: Record<string, string> = {
  rookie:       'Rookie',
  intermediate: 'Intermediate',
  veteran:      'Veteran',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { isReady, getUser, getAllSessions } = useDatabase();
  const [user,     setUser]     = useState<UserRecord | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!isReady) return;
    Promise.all([getUser(), getAllSessions()]).then(([u, s]) => {
      setUser(u);
      setSessions(s);
      setLoading(false);
    });
  }, [isReady]);

  const openSession = (session: ChatSession) => {
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        sessionId: String(session.id),
        type:      session.incident_type  ?? '',
        title:     session.incident_title ?? 'Chat',
      },
    });
  };

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
          {/* ── User header ────────────────────────────────────────────── */}
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

          {/* ── Health info ────────────────────────────────────────────── */}
          <InfoCard title="Health Information">
            <InfoRow label="Medical history" value={user.medical_history || null} />
            <TagList  label="Conditions & allergies" raw={user.health_conditions} />
            <TagList  label="Disabilities / mobility" raw={user.disabilities} />
            {!user.medical_history && !user.health_conditions && !user.disabilities && (
              <Text style={s.emptySection}>No health information provided.</Text>
            )}
          </InfoCard>

          {/* ── Responder experience ───────────────────────────────────── */}
          {user.role === 'responder' && user.experience_level && (
            <InfoCard title="Responder Details">
              <InfoRow
                label="Experience level"
                value={EXPERIENCE_LABELS[user.experience_level] ?? user.experience_level}
              />
            </InfoCard>
          )}

          {/* ── Chat history ───────────────────────────────────────────── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Chat History</Text>
            <Text style={s.sectionCount}>{sessions.length}</Text>
          </View>

          {sessions.length === 0 ? (
            <View style={s.emptyHistory}>
              <Text style={s.emptyHistoryIcon}>💬</Text>
              <Text style={s.emptyHistoryText}>No conversations yet.</Text>
              <Text style={s.emptyHistoryHint}>
                Start a chat by tapping an emergency type on the home screen.
              </Text>
            </View>
          ) : (
            <View style={s.sessionList}>
              {sessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onPress={() => openSession(session)}
                />
              ))}
            </View>
          )}

          {/* ── Privacy note ───────────────────────────────────────────── */}
          <View style={s.privacyNote}>
            <Text style={s.privacyIcon}>🔒</Text>
            <Text style={s.privacyText}>
              All profile and conversation data is stored only on this device and is never sent to external servers.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:{ ...Typography.bodyMd, color: Colors.onSurfaceVariant },

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

  // ── Header
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
  avatarText: { ...Typography.headlineMd, color: Colors.onPrimaryContainer, fontSize: 30 },
  headerMeta: { flex: 1, gap: 4 },
  name:   { ...Typography.headlineMd, color: Colors.onSurface },
  sector: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  // ── Role badge
  badge:              { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full, marginTop: 4 },
  badgeResponder:     { backgroundColor: 'rgba(157,152,255,0.15)' },
  badgeUser:          { backgroundColor: 'rgba(255,126,95,0.12)' },
  badgeText:          { ...Typography.labelSm },
  badgeTextResponder: { color: Colors.tertiary },
  badgeTextUser:      { color: Colors.primaryContainer },

  // ── Info cards
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle:    { ...Typography.labelMd, color: Colors.primaryContainer, marginBottom: 4 },
  infoRow:      { gap: 2 },
  infoLabel:    { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  infoValue:    { ...Typography.bodyMd, color: Colors.onSurface },
  emptySection: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontStyle: 'italic' },

  // ── Tags
  tagSection: { gap: 6 },
  tagRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  tagText: { ...Typography.labelSm, color: Colors.onSurface },

  // ── Section header (chat history)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.labelMd, color: Colors.onSurface, flex: 1 },
  sectionCount: {
    ...Typography.labelSm,
    color: Colors.onPrimaryContainer,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  // ── Session list
  sessionList: { gap: Spacing.sm },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sessionIconWrap: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionEmoji:   { fontSize: 20 },
  sessionBody:    { flex: 1, gap: 2 },
  sessionLabel:   { ...Typography.labelMd, color: Colors.onSurface },
  sessionPreview: { ...Typography.labelSm, color: Colors.onSurfaceVariant, lineHeight: 17 },
  sessionDate:    { ...Typography.labelSm, color: Colors.outline, marginTop: 2 },
  sessionChevron: { fontSize: 24, color: Colors.onSurfaceVariant, lineHeight: 28 },

  // ── Empty history
  emptyHistory: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyHistoryIcon: { fontSize: 32 },
  emptyHistoryText: { ...Typography.labelMd, color: Colors.onSurface },
  emptyHistoryHint: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },

  // ── Privacy note
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
