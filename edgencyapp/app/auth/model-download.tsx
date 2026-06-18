import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  downloadAsset,
  LLAMA_TOOL_CALLING_1B_INST_Q4_K,
  GEMMA4_2B_MULTIMODAL_Q4_K_M,
  MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
  WHISPER_TINY_Q8_0,
  TTS_EN_SUPERTONIC_Q4_0,
  loadModel,
  VERBOSITY,
  type ModelProgressUpdate,
} from '@qvac/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

const { width } = Dimensions.get('window');

// ─── Phase config ─────────────────────────────────────────────────────────────
type Phase = 'downloading' | 'loading' | 'voice-downloading' | 'ready' | 'error';

const PHASE_COPY: Record<Phase, { headline: string; sub: string; emoji: string }> = {
  downloading: {
    headline: 'Setting up your local AI',
    sub: 'Downloading the Llama 3.2 model to your device. This only happens once — the AI will work offline after this.',
    emoji: '🧠',
  },
  loading: {
    headline: 'Almost ready',
    sub: 'Loading the AI engine into memory. This takes a moment on first launch.',
    emoji: '⚡',
  },
  'voice-downloading': {
    headline: 'Setting up voice',
    sub: 'Downloading on-device voice models so Edgent can hear you and speak back.',
    emoji: '🎙',
  },
  ready: {
    headline: "You're all set",
    sub: 'Your local AI is online. All inference runs on-device — no data ever leaves your phone.',
    emoji: '✅',
  },
  error: {
    headline: 'Something went wrong',
    sub: 'The AI model could not be loaded. You can continue without it — the app will retry on next launch.',
    emoji: '⚠️',
  },
};

// ─── Animated ring ────────────────────────────────────────────────────────────
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
          Animated.timing(scale,   { toValue: 1,    duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4,  duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View style={[
      styles.pulseRing,
      { transform: [{ scale }], opacity },
    ]} />
  );
}

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
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: fillWidth }]}>
        {/* Shimmer highlight */}
        <View style={styles.progressShimmer} />
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ModelDownloadScreen() {
  const [phase,    setPhase]    = useState<Phase>('downloading');
  const [pct,      setPct]      = useState(0);
  const [asrPct,   setAsrPct]   = useState(0);
  const [ttsPct,   setTtsPct]   = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Content fade when phase changes
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(16)).current;
  // Button fade-in when ready
  const btnOpacity  = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(0.9)).current;

  const fadeInContent = () => {
    contentOpacity.setValue(0);
    contentY.setValue(16);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const showButton = () => {
    Animated.parallel([
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(btnScale,   { toValue: 1, useNativeDriver: true, bounciness: 10 }),
    ]).start();
  };

  // ── Download + load on mount ───────────────────────────────────────────────
  useEffect(() => {
    fadeInContent();

    let cancelled = false;

    (async () => {
      try {
        // 1. Download weights
        await downloadAsset({
          assetSrc: LLAMA_TOOL_CALLING_1B_INST_Q4_K,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setPct(Math.round(p.percentage));
          },
        });
        await downloadAsset({
          assetSrc: GEMMA4_2B_MULTIMODAL_Q4_K_M,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setPct(Math.round(p.percentage));
          },
        });

        await downloadAsset({
          assetSrc: MMPROJ_GEMMA4_2B_MULTIMODAL_F16,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setPct(Math.round(p.percentage));
          },
        });

        const MODEL_URL = 'https://huggingface.co/buckets/NatXeth/MedPsy-1.7B-GGUF-bucket/resolve/medpsy-1.7b-q4_k_m-imat.gguf?download=true';

        await downloadAsset({
          assetSrc: MODEL_URL,
          onProgress: (progress: ModelProgressUpdate) => {
            if (!cancelled) setPct(Math.round(progress.percentage));
          },
        });

        if (cancelled) return;

        // 2. Load into memory
        setPhase('loading');
        setPct(0);
        fadeInContent();

        await loadModel({
          modelSrc:    LLAMA_TOOL_CALLING_1B_INST_Q4_K,
          modelType:   'llm',
          modelConfig: {
            device:    'gpu',
            ctx_size:  2048,
            verbosity: VERBOSITY.ERROR,
          },
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setPct(Math.round(p.percentage));
          },
        });

        if (cancelled) return;

        // 3. Download voice models (Whisper ASR + Supertonic TTS)
        setPhase('voice-downloading');
        setAsrPct(0);
        setTtsPct(0);
        fadeInContent();

        await downloadAsset({
          assetSrc: WHISPER_TINY_Q8_0,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setAsrPct(Math.round(p.percentage));
          },
        });

        await downloadAsset({
          assetSrc: TTS_EN_SUPERTONIC_Q4_0,
          onProgress: (p: ModelProgressUpdate) => {
            if (!cancelled) setTtsPct(Math.round(p.percentage));
          },
        });

        if (cancelled) return;

        // 4. Mark everything as pre-loaded
        await AsyncStorage.multiSet([
          ['model_preloaded', 'true'],
          ['voice_preloaded', 'true'],
        ]);

        setPct(100);
        setPhase('ready');
        fadeInContent();
        showButton();
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? String(e));
          setPhase('error');
          fadeInContent();
          showButton(); // allow continue without AI
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const copy   = PHASE_COPY[phase];
  const isActive = phase === 'downloading' || phase === 'loading' || phase === 'voice-downloading';
  const showProgress = isActive;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Ambient background glow */}
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
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{copy.emoji}</Text>
          </View>
        </View>

        {/* Copy */}
        <Animated.View style={[styles.copyBlock, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>
          <Text style={styles.headline}>{copy.headline}</Text>
          <Text style={styles.subText}>{copy.sub}</Text>
          {phase === 'error' && errorMsg ? (
            <Text style={styles.errorMsg}>{errorMsg}</Text>
          ) : null}
        </Animated.View>

        {/* Progress */}
        {showProgress && phase !== 'voice-downloading' && (
          <View style={styles.progressBlock}>
            <ProgressBar pct={pct} />
            <View style={styles.progressLabels}>
              <Text style={styles.progressPhase}>
                {phase === 'downloading' ? 'Downloading model…' : 'Loading AI engine…'}
              </Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
          </View>
        )}
        {phase === 'voice-downloading' && (
          <View style={styles.progressBlock}>
            <View style={styles.voiceRow}>
              <Text style={styles.progressPhase}>Speech recognition</Text>
              <Text style={styles.progressPct}>{asrPct}%</Text>
            </View>
            <ProgressBar pct={asrPct} />
            <View style={[styles.voiceRow, { marginTop: Spacing.sm }]}>
              <Text style={styles.progressPhase}>Voice synthesis</Text>
              <Text style={styles.progressPct}>{ttsPct}%</Text>
            </View>
            <ProgressBar pct={ttsPct} />
          </View>
        )}

        {/* Continue button — appears when ready or error */}
        <Animated.View style={[styles.btnWrap, { opacity: btnOpacity, transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={[styles.continueBtn, phase === 'error' && styles.continueBtnError]}
            onPress={() => router.replace('/auth/rag-setup')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {phase === 'ready' ? 'Enter Edgency →' : 'Continue without AI →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Fine print */}
        <View style={styles.finePrint}>
          <Text style={styles.finePrintIcon}>🔒</Text>
          <Text style={styles.finePrintText}>
            The AI model runs entirely on your device. No prompts, messages, or personal data are ever sent to any server.
          </Text>
        </View>
      </View>
    </View>
  );
}

const RING_SIZE = 200;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgGlow: {
    position: 'absolute',
    width: 380, height: 380,
    borderRadius: 190,
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

  // Brand
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'absolute', top: 60 },
  brandStar: { fontSize: 20, color: Colors.primaryContainer },
  brandName: { ...Typography.headlineMd, fontSize: 18, color: Colors.primaryContainer },

  // Icon
  iconCluster: { alignItems: 'center', justifyContent: 'center', width: RING_SIZE, height: RING_SIZE },
  pulseRing: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.primaryContainer,
  },
  iconCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconEmoji: { fontSize: 44 },

  // Copy
  copyBlock: { alignItems: 'center', gap: Spacing.sm, maxWidth: 320 },
  headline:  { ...Typography.headlineLgMobile, color: Colors.onSurface, textAlign: 'center' },
  subText:   { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  errorMsg:  { ...Typography.labelSm, color: Colors.error, textAlign: 'center', marginTop: 4 },

  // Progress
  progressBlock: { width: '100%', gap: Spacing.sm },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 40,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  voiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressPhase:  { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  progressPct:    { ...Typography.labelSm, color: Colors.primaryContainer },

  // Continue button
  btnWrap: { width: '100%' },
  continueBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  continueBtnError: {
    backgroundColor: Colors.surfaceVariant,
    shadowOpacity: 0,
  },
  continueBtnText: { ...Typography.labelMd, color: Colors.onPrimaryContainer, fontSize: 16 },

  // Fine print
  finePrint: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    position: 'absolute',
    bottom: 48,
    left: Spacing.marginMobile,
    right: Spacing.marginMobile,
  },
  finePrintIcon: { fontSize: 14, flexShrink: 0 },
  finePrintText: { ...Typography.labelSm, color: Colors.outlineVariant, flex: 1, lineHeight: 17 },
});
