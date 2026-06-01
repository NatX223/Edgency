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
import { MonitorHeartIcon } from '@/components/onboarding/MonitorHeartIcon';
import { StepperDots } from '@/components/onboarding/StepperDots';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';

export default function OnboardingScreen1() {
  const skipOpacity    = useRef(new Animated.Value(0)).current;
  const iconOpacity    = useRef(new Animated.Value(0)).current;
  const iconY          = useRef(new Animated.Value(30)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY      = useRef(new Animated.Value(24)).current;
  const subOpacity     = useRef(new Animated.Value(0)).current;
  const subY           = useRef(new Animated.Value(20)).current;
  const bottomOpacity  = useRef(new Animated.Value(0)).current;
  const bottomY        = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    Animated.stagger(90, [
      Animated.timing(skipOpacity, { toValue: 1, duration: 400, easing: ease, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),
        Animated.timing(iconY,       { toValue: 0, duration: 600, easing: ease, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 500, easing: ease, useNativeDriver: true }),
        Animated.timing(headlineY,       { toValue: 0, duration: 500, easing: ease, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 500, easing: ease, useNativeDriver: true }),
        Animated.timing(subY,       { toValue: 0, duration: 500, easing: ease, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bottomOpacity, { toValue: 1, duration: 500, easing: ease, useNativeDriver: true }),
        Animated.timing(bottomY,       { toValue: 0, duration: 500, easing: ease, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <AmbientGlow />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: skipOpacity }]}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hero */}
        <View style={styles.hero}>
          <Animated.View style={{ opacity: iconOpacity, transform: [{ translateY: iconY }] }}>
            <HeroIcon size={140}>
              <MonitorHeartIcon size={64} color={Colors.primaryContainer} />
            </HeroIcon>
          </Animated.View>

          <View style={styles.copy}>
            <Animated.Text style={[styles.headline, { opacity: headlineOpacity, transform: [{ translateY: headlineY }] }]}>
              Empathetic guidance when seconds matter.
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { opacity: subOpacity, transform: [{ translateY: subY }] }]}>
              Our local AI provides immediate support even without a signal.
            </Animated.Text>
          </View>
        </View>

        {/* Bottom */}
        <Animated.View style={[styles.bottom, { opacity: bottomOpacity, transform: [{ translateY: bottomY }] }]}>
          <StepperDots total={3} current={0} />
          <PrimaryButton
            label="Next"
            showArrow
            onPress={() => router.push('/onboarding/screen2')}
            style={styles.cta}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1, paddingHorizontal: Spacing.marginMobile },
  header:   { paddingTop: Spacing.md, alignItems: 'flex-end' },
  skipBtn:  { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.full },
  skipText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  hero:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  copy:     { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, maxWidth: 340 },
  headline: { ...Typography.headlineLgMobile, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyLg, color: Colors.onSurfaceVariant, textAlign: 'center' },
  bottom:   { paddingBottom: Spacing.xl, alignItems: 'center', gap: Spacing.xl },
  cta:      { width: '100%' },
});
