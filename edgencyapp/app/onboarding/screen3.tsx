import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { AmbientGlow } from '@/components/onboarding/AmbientGlow';
import { HeroIcon } from '@/components/onboarding/HeroIcon';
import { PeopleIcon } from '@/components/onboarding/PeopleIcon';
import { StepperDots } from '@/components/onboarding/StepperDots';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';

// async function completeOnboarding() {
//   await AsyncStorage.setItem('onboarding_complete', 'true');
//   router.replace('/(tabs)');
// }

export default function OnboardingScreen3() {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(20)).current;
  const badgeScale     = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),
      Animated.timing(contentY,       { toValue: 0, duration: 600, easing: ease, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, delay: 300, useNativeDriver: true, bounciness: 10 }),
    ]).start();
  }, []);

    // ✅ Changed: routes to signup instead of tabs
    const handleGetStarted = () => router.replace('/auth/signup');

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <AmbientGlow />

      <SafeAreaView style={styles.safeArea}>
        {/* No skip on last screen — just a back affordance */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <Animated.View
          style={[styles.hero, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}
        >
          <HeroIcon size={140}>
            <PeopleIcon size={64} color={Colors.primaryContainer} />
          </HeroIcon>

          <View style={styles.copy}>
            <Text style={styles.headline}>
              You're never{'\n'}alone in a crisis.
            </Text>
            <Text style={styles.subtitle}>
              Connect your circle, share your status, and let Edgency coordinate help on your behalf.
            </Text>
          </View>

          {/* Trust badge */}
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Trusted by 50,000+ users worldwide</Text>
          </Animated.View>
        </Animated.View>

        {/* Bottom */}
        <Animated.View style={[styles.bottom, { opacity: contentOpacity }]}>
          <StepperDots total={3} current={2} />
          <PrimaryButton
            label="Get Started"
            showArrow
            onPress={handleGetStarted}
            style={styles.cta}
          />
          <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.6}>
            <Text style={styles.signIn}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1, paddingHorizontal: Spacing.marginMobile },
  header:   { paddingTop: Spacing.md, alignItems: 'flex-start' },
  backBtn:  { paddingVertical: 8, paddingHorizontal: 4, borderRadius: Radii.full },
  backText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },

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

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success ?? '#00B894',
  },
  badgeText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },

  bottom: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  cta: { width: '100%' },
  signIn: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  signInLink: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
