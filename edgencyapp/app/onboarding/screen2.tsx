import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { AmbientGlow } from '@/components/onboarding/AmbientGlow';
import { HeroIcon } from '@/components/onboarding/HeroIcon';
import { ShieldIcon } from '@/components/onboarding/ShieldIcon';
import { StepperDots } from '@/components/onboarding/StepperDots';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';

// Feature chip data
const FEATURES = [
  { icon: '📍', label: 'Live location sharing' },
  { icon: '🔔', label: 'Smart alert zones' },
  { icon: '⚡', label: 'Offline-first AI' },
];

export default function OnboardingScreen2() {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1, duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentY, {
        toValue: 0, duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Tertiary (indigo) tinted glow for visual variety */}
      <View style={styles.indigoGlow} pointerEvents="none" />
      <AmbientGlow />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <Animated.View
          style={[styles.hero, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}
        >
          <HeroIcon size={140}>
            <ShieldIcon size={64} color={Colors.primaryContainer} />
          </HeroIcon>

          <View style={styles.copy}>
            <Text style={styles.headline}>Stay safe,{'\n'}stay prepared.</Text>
            <Text style={styles.subtitle}>
              Real-time tools built to protect you and the people you love — before emergencies happen.
            </Text>
          </View>

          {/* Feature chips */}
          <View style={styles.chips}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.chip}>
                <Text style={styles.chipIcon}>{f.icon}</Text>
                <Text style={styles.chipLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Bottom */}
        <Animated.View style={[styles.bottom, { opacity: contentOpacity }]}>
          <StepperDots total={3} current={1} />
          <PrimaryButton
            label="Next"
            showArrow
            onPress={() => router.push('/onboarding/screen3')}
            style={styles.cta}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.background },
  indigoGlow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 400,
    backgroundColor: Colors.tertiary,
    opacity: 0.03,
  },
  safeArea: { flex: 1, paddingHorizontal: Spacing.marginMobile },
  header:   { paddingTop: Spacing.md, alignItems: 'flex-end' },
  skipBtn:  { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.full },
  skipText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxWidth: 340,
  },
  headline: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },

  chips: { flexDirection: 'column', gap: Spacing.sm, width: '100%', paddingHorizontal: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  chipIcon:  { fontSize: 18 },
  chipLabel: { ...Typography.labelMd, color: Colors.onSurface },

  bottom: { paddingBottom: Spacing.xl, alignItems: 'center', gap: Spacing.xl },
  cta:    { width: '100%' },
});
