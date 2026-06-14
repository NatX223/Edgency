import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { useRAG } from '@/hooks/useRag';

// ─── Phase config ─────────────────────────────────────────────────────────────
type Phase = 'downloading_model' | 'loading_model' | 'copying_assets' |
             'ingesting' | 'reindexing' | 'ready' | 'error' | 'idle';

const PHASE_COPY: Record<Phase, { headline: string; sub: string; emoji: string }> = {
  idle: {
    headline: 'Preparing knowledge base',
    sub: 'Starting up…',
    emoji: '📚',
  },
  downloading_model: {
    headline: 'Downloading AI knowledge',
    sub: 'Fetching the embeddings model that powers medical protocol search. This only happens once.',
    emoji: '⬇️',
  },
  loading_model: {
    headline: 'Loading AI knowledge',
    sub: 'Initialising the embeddings engine in memory.',
    emoji: '⚙️',
  },
  copying_assets: {
    headline: 'Preparing documents',
    sub: 'Copying WHO emergency protocols to your device.',
    emoji: '📋',
  },
  ingesting: {
    headline: 'Indexing medical protocols',
    sub: 'Building a searchable knowledge base from WHO prehospital emergency care guidelines.',
    emoji: '🧠',
  },
  reindexing: {
    headline: 'Optimising search',
    sub: 'Calibrating the vector index for fast, accurate retrieval during emergencies.',
    emoji: '⚡',
  },
  ready: {
    headline: 'Knowledge base ready',
    sub: 'All 68 WHO emergency protocols are indexed and searchable on-device. No internet required.',
    emoji: '✅',
  },
  error: {
    headline: 'Knowledge base unavailable',
    sub: 'The AI could not index the medical protocols. The app will still work but without protocol search.',
    emoji: '⚠️',
  },
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const fillWidth = fillAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: fillWidth }]}>
        <View style={styles.progressShimmer} />
      </Animated.View>
    </View>
  );
}

// ─── Animated pulse ring ──────────────────────────────────────────────────────
function PulseRing({ active }: { active: boolean }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.35, duration: 1100, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,    duration: 1100, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RAGIngestionScreen() {
  const { status } = useRAG();

  const phase    = status.phase as Phase;
  const copy     = PHASE_COPY[phase] ?? PHASE_COPY.idle;
  const isActive = !['ready', 'error', 'idle'].includes(phase);
  const isDone   = phase === 'ready';
  const isError  = phase === 'error';

  // Content fade on phase change
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const prevPhase      = useRef(phase);

  useEffect(() => {
    if (prevPhase.current === phase) return;
    prevPhase.current = phase;
    // Quick crossfade
    Animated.sequence([
      Animated.timing(contentOpacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1,   duration: 300, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  // Button fade-in when done or error
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    if (!isDone && !isError) return;
    Animated.parallel([
      Animated.timing(btnOpacity, { toValue: 1,   duration: 400, useNativeDriver: true }),
      Animated.spring(btnScale,   { toValue: 1,   useNativeDriver: true, bounciness: 10 }),
    ]).start();
  }, [isDone, isError]);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.bgGlow} pointerEvents="none" />

      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandStar}>✳</Text>
          <Text style={styles.brandName}>Edgency</Text>
        </View>

        {/* Icon cluster */}
        <View style={styles.iconCluster}>
          <PulseRing active={isActive} />
          <View style={[styles.iconCircle, isDone && styles.iconCircleDone]}>
            <Text style={styles.iconEmoji}>{copy.emoji}</Text>
          </View>
        </View>

        {/* Copy */}
        <Animated.View style={[styles.copyBlock, { opacity: contentOpacity }]}>
          <Text style={styles.headline}>{copy.headline}</Text>
          <Text style={styles.subText}>{copy.sub}</Text>
          {isError && status.label && (
            <Text style={styles.errorDetail}>{status.label}</Text>
          )}
        </Animated.View>

        {/* Progress bar — shown while ingesting */}
        {isActive && status.progress != null && (
          <View style={styles.progressBlock}>
            <ProgressBar pct={status.progress} />
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel} numberOfLines={1}>
                {status.label}
              </Text>
              <Text style={styles.progressPct}>{status.progress}%</Text>
            </View>
          </View>
        )}

        {/* Indeterminate activity for phases without percentage */}
        {isActive && status.progress == null && (
          <View style={styles.progressBlock}>
            <View style={styles.progressTrackDim}>
              <IndeterminateBar />
            </View>
            <Text style={styles.progressLabel} numberOfLines={1}>
              {status.label}
            </Text>
          </View>
        )}

        {/* Stats when ready */}
        {isDone && (
          <View style={styles.statsRow}>
            <StatChip emoji="📄" label="148 protocols" />
            <StatChip emoji="🔒" label="100% offline" />
            <StatChip emoji="⚡" label="On-device" />
          </View>
        )}

        {/* Continue / Skip button */}
        <Animated.View style={[styles.btnWrap, { opacity: btnOpacity, transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[styles.btn, isError && styles.btnError]}
            onPress={() => router.replace('/(tabs)' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {isDone ? 'Start Edgency →' : 'Continue without RAG →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Fine print */}
        <View style={styles.finePrint}>
          <Text style={styles.finePrintIcon}>🏥</Text>
          <Text style={styles.finePrintText}>
            Powered by WHO Prehospital Emergency Care: Clinical Protocols. All data stays on your device.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Indeterminate bar ────────────────────────────────────────────────────────
function IndeterminateBar() {
  const translateX = useRef(new Animated.Value(-150)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue:  300,
        duration: 1200,
        easing:   Easing.inOut(Easing.sin),
        useNativeDriver: true,
      })
    ).start();
  }, []);
  return (
    <Animated.View
      style={[styles.indeterminateFill, { transform: [{ translateX }] }]}
    />
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RING_SIZE = 160;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bgGlow: {
    position: 'absolute',
    width: 380, height: 380, borderRadius: 190,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.06,
    top: -80, alignSelf: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.xl,
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', top: 56 },
  brandStar: { fontSize: 20, color: Colors.primaryContainer },
  brandName: { ...Typography.headlineMd, fontSize: 18, color: Colors.primaryContainer },

  iconCluster: { alignItems: 'center', justifyContent: 'center', width: RING_SIZE, height: RING_SIZE },
  pulseRing: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.primaryContainer,
  },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  iconCircleDone: { borderColor: Colors.primaryContainer, borderWidth: 1.5 },
  iconEmoji: { fontSize: 38 },

  copyBlock: { alignItems: 'center', gap: Spacing.sm, maxWidth: 320 },
  headline:  { ...Typography.headlineLgMobile, color: Colors.onSurface, textAlign: 'center' },
  subText:   { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  errorDetail: { ...Typography.labelSm, color: Colors.error, textAlign: 'center', marginTop: 4 },

  progressBlock: { width: '100%', gap: Spacing.sm },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3, overflow: 'hidden',
  },
  progressTrackDim: {
    width: '100%', height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.primaryContainer,
    borderRadius: 3, overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute', top: 0, bottom: 0,
    width: 40, right: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
  indeterminateFill: {
    position: 'absolute',
    top: 0, bottom: 0, width: 120,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 3, opacity: 0.7,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:  { ...Typography.labelSm, color: Colors.onSurfaceVariant, flex: 1, marginRight: 8 },
  progressPct:    { ...Typography.labelSm, color: Colors.primaryContainer },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statEmoji: { fontSize: 13 },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },

  btnWrap: { width: '100%' },
  btn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  btnError:  { backgroundColor: Colors.surfaceVariant, shadowOpacity: 0 },
  btnText:   { ...Typography.labelMd, color: Colors.onPrimaryContainer, fontSize: 16 },

  finePrint: {
    flexDirection: 'row', gap: Spacing.sm,
    position: 'absolute', bottom: 44,
    left: Spacing.marginMobile, right: Spacing.marginMobile,
  },
  finePrintIcon: { fontSize: 13, flexShrink: 0 },
  finePrintText: { ...Typography.labelSm, color: Colors.outlineVariant, flex: 1, lineHeight: 17 },
});
