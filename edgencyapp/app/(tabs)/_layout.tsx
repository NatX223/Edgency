import { Tabs } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '@/constants/tokens';

// ─── Custom tab bar button ────────────────────────────────────────────────────
function TabItem({
  label,
  emoji,
  active,
  onPress,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onPress?: () => void;
}) {
  const bgScale   = useRef(new Animated.Value(active ? 1 : 0)).current;
  const txtOpacity= useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bgScale, { toValue: active ? 1 : 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(txtOpacity, { toValue: active ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return (
    <TouchableOpacity style={ti.wrap} onPress={onPress} activeOpacity={0.8}>
      <View style={ti.inner}>
        <Animated.View style={[ti.pill, { transform: [{ scaleX: bgScale }], opacity: bgScale }]} />
        <Text style={[ti.emoji, active && ti.emojiActive]}>{emoji}</Text>
        <Animated.Text style={[ti.label, { opacity: txtOpacity }]}>{label}</Animated.Text>
      </View>
    </TouchableOpacity>
  );
}
const ti = StyleSheet.create({
  wrap:       { flex: 1, alignItems: 'center' },
  inner:      { flexDirection: 'row', alignItems: 'center', gap: 5, position: 'relative', paddingVertical: 8, paddingHorizontal: 12 },
  pill:       { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,126,95,0.18)', borderRadius: Radii.full, top: 0, bottom: 0, left: 0, right: 0 },
  emoji:      { fontSize: 20, opacity: 0.5 },
  emojiActive:{ opacity: 1 },
  label:      { ...Typography.labelMd, color: Colors.primaryContainer, fontSize: 12 },
});

// ─── Tab layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle:  styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor:   Colors.primaryContainer,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
      }}
      tabBar={(props) => {
        const routes  = props.state.routes;
        const current = props.state.index;
        return (
          <View style={styles.tabBar}>
            {routes.map((route, i) => {
              const ICONS: Record<string, { emoji: string; label: string }> = {
                index:     { emoji: '🏥', label: 'Emergency' },
                chat:      { emoji: '💬', label: 'Chat'      },
                profile:   { emoji: '👤', label: 'Profile'   },
              };
              const cfg = ICONS[route.name] ?? { emoji: '●', label: route.name };
              return (
                <TabItem
                  key={route.key}
                  label={cfg.label}
                  emoji={cfg.emoji}
                  active={i === current}
                  onPress={() => props.navigation.navigate(route.name)}
                />
              );
            })}
          </View>
        );
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Emergency' }} />
      <Tabs.Screen name="chat"      options={{ title: 'Chat'      }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile'   }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32,31,31,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    height: 72,
    // Coral glow on top edge
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
});
