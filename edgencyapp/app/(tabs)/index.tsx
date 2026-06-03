import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { SOSButton }     from '@/components/home/SOSButton';
import { IncidentCard }  from '@/components/home/IncidentCard';
import { MapPreview }    from '@/components/home/MapPreview';
import { AIStatusPill }  from '@/components/home/AIStatusPill';

const { width } = Dimensions.get('window');

// ─── Sub-components (inlined to keep file count lean) ────────────────────────

function TopBar() {
  return (
    <View style={tb.row}>
      <View style={tb.brand}>
        <Text style={tb.star}>✳</Text>
        <Text style={tb.name}>Edgency</Text>
      </View>
    </View>
  );
}
const tb = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.md, paddingTop: 80 },
  brand:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  star: { fontSize: 30, color: Colors.primaryContainer },
  name: { ...Typography.headlineMd, fontSize: 24, color: Colors.primaryContainer },
  menu: { fontSize: 22, color: Colors.onSurface },
});

function WelcomeSection() {
  return (
    <View style={ws.container}>
      <View>
        <Text style={ws.greeting}>Good morning, Miller</Text>

      </View>
      <View style={ws.locationPill}>
        <Text style={ws.locationIcon}>🟢</Text>
        <Text style={ws.locationText}>First responder</Text>
      </View>
    </View>
  );
}
const ws = StyleSheet.create({
  container:   { gap: Spacing.sm },
  greeting:    { ...Typography.headlineLgMobile, color: Colors.onSurface },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer },
  statusText:  { ...Typography.bodyLg, color: Colors.onSurfaceVariant },
  locationPill:{
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(32,31,31,0.7)',
    borderRadius: Radii.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  locationIcon:{ fontSize: 16 },
  locationText:{ ...Typography.labelMd, color: Colors.onSurface },
});

// function SOSCard() {
//   return (
//     <View style={sc.card}>
//       {/* Ambient coral glow inside card */}
//       <View style={sc.innerGlow} />
//       <Text style={sc.title}>Emergency Assistance</Text>
//       <SOSButton />
//     </View>
//   );
// }
const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.12)',
    overflow: 'hidden',
    // Coral ambient shadow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  innerGlow: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.05,
    top: -60,
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
});

function ResponderPortal() {
  return (
    <View style={rp.card}>
      {/* Header */}
      <View style={rp.header}>
        <View style={rp.titleRow}>
          <Text style={rp.bellIcon}>🆘</Text>
          <Text style={rp.title}>Emergencies</Text>
        </View>
      </View>

      {/* Incident list */}
      <View style={rp.list}>
        <IncidentCard
          title="Medical"
          example1="Seizures"
          example2="bleeding"
          type="medical"
        />
        <IncidentCard
          title="Earthquakes"
          example1="Land slides"
          example2="Tremors"
          type="earth"
        />
        <IncidentCard
          title="Floods"
          example1="Tsunamis"
          example2="Flash Floods"
          type="flood"
        />
        <IncidentCard
          title="Storms"
          example1="Tornados"
          example2="Heavy Winds"
          type="storm"
        />
      </View>

      {/* Go On-Duty CTA */}
      <TouchableOpacity style={rp.dutyBtn} activeOpacity={0.8}>
        <Text style={rp.dutyText}>Search and Rescue</Text>
      </TouchableOpacity>
    </View>
  );
}
const rp = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bellIcon:  { fontSize: 20 },
  title:     { ...Typography.headlineMd, fontSize: 18, color: Colors.onSurface },
  badge:     { backgroundColor: Colors.errorContainer, borderRadius: Radii.full, paddingVertical: 4, paddingHorizontal: 12 },
  badgeText: { ...Typography.labelMd, color: Colors.onErrorContainer },
  list:      { gap: Spacing.sm },
  dutyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radii.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  dutyIcon:  { fontSize: 18 },
  dutyText:  { ...Typography.labelMd, color: Colors.onSurface, fontSize: 15 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  // Staggered entrance
  const fadeY = (offset = 20) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(offset)).current;
    return { opacity, translateY };
  };

  const topBarAnim    = { opacity: useRef(new Animated.Value(0)).current, translateY: useRef(new Animated.Value(-12)).current };
  const welcomeAnim   = { opacity: useRef(new Animated.Value(0)).current, translateY: useRef(new Animated.Value(20)).current  };
  const sosAnim       = { opacity: useRef(new Animated.Value(0)).current, translateY: useRef(new Animated.Value(24)).current  };
  const portalAnim    = { opacity: useRef(new Animated.Value(0)).current, translateY: useRef(new Animated.Value(24)).current  };
  const mapAnim       = { opacity: useRef(new Animated.Value(0)).current, translateY: useRef(new Animated.Value(24)).current  };

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const anim = (a: typeof topBarAnim, delay: number) =>
      Animated.parallel([
        Animated.timing(a.opacity,     { toValue: 1, duration: 500, delay, easing: ease, useNativeDriver: true }),
        Animated.timing(a.translateY,  { toValue: 0, duration: 500, delay, easing: ease, useNativeDriver: true }),
      ]);

    Animated.parallel([
      anim(topBarAnim,  0),
      anim(welcomeAnim, 80),
      anim(sosAnim,     160),
      anim(portalAnim,  240),
      anim(mapAnim,     320),
    ]).start();
  }, []);

  const animStyle = (a: typeof topBarAnim) => ({
    opacity: a.opacity,
    transform: [{ translateY: a.translateY }],
  });

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Background ambient coral orb */}
      <View style={styles.bgGlow} pointerEvents="none" />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={animStyle(topBarAnim)}>
          <TopBar />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={animStyle(welcomeAnim)}>
            <WelcomeSection />
          </Animated.View>

          {/* <Animated.View style={animStyle(sosAnim)}>
            <SOSCard />
          </Animated.View> */}

          <Animated.View style={animStyle(portalAnim)}>
            <ResponderPortal />
          </Animated.View>

          {/* <Animated.View style={animStyle(mapAnim)}>
            <MapPreview />
          </Animated.View> */}

          {/* Bottom padding clears the tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Floating AI status pill — sits above tab bar */}
      <View style={styles.pillWrap} pointerEvents="none">
        <AIStatusPill />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.background },
  bgGlow: {
    position: 'absolute',
    width: 340, height: 340,
    borderRadius: 170,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.05,
    top: -80,
    alignSelf: 'center',
  },
  safe:        { flex: 1, paddingHorizontal: Spacing.marginMobile },
  scroll:      { flex: 1 },
  scrollContent:{ gap: Spacing.lg, paddingBottom: Spacing.xl },
  pillWrap: {
    position: 'absolute',
    bottom: 26,         // just above the tab bar
    left: 0, right: 0,
    alignItems: 'center',
  },
});
