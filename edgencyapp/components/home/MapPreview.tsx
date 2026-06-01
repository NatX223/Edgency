import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { StatusChip } from './StatusChip';

const { width } = Dimensions.get('window');
const MAP_H = 200;

// Simple procedural "city map" drawn with SVG lines
function CityMapSvg({ w, h }: { w: number; h: number }) {
  const coral = Colors.primaryContainer;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Grid streets */}
      {[0.2, 0.38, 0.56, 0.74, 0.88].map((t, i) => (
        <Line key={`h${i}`} x1={0} y1={t * h} x2={w} y2={t * h}
          stroke="rgba(255,126,95,0.18)" strokeWidth={i === 2 ? 2 : 1} />
      ))}
      {[0.15, 0.3, 0.5, 0.65, 0.8, 0.92].map((t, i) => (
        <Line key={`v${i}`} x1={t * w} y1={0} x2={t * w} y2={h}
          stroke="rgba(255,126,95,0.18)" strokeWidth={i === 2 ? 2 : 1} />
      ))}
      {/* Diagonal route */}
      <Path d={`M ${w * 0.15} ${h * 0.2} L ${w * 0.5} ${h * 0.56} L ${w * 0.8} ${h * 0.38}`}
        stroke={coral} strokeWidth={2.5} strokeOpacity={0.7}
        fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Active location pings */}
      <Circle cx={w * 0.5}  cy={h * 0.56} r={5} fill={coral} opacity={0.9} />
      <Circle cx={w * 0.5}  cy={h * 0.56} r={11} fill={coral} opacity={0.2} />
      <Circle cx={w * 0.8}  cy={h * 0.38} r={4} fill={Colors.tertiary} opacity={0.8} />
      <Circle cx={w * 0.3}  cy={h * 0.75} r={3} fill={coral} opacity={0.6} />
    </Svg>
  );
}

export function MapPreview() {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-MAP_H, MAP_H],
  });

  const cardW = width - 40; // account for horizontal padding

  return (
    <View style={styles.card}>
      {/* Map canvas */}
      <View style={[styles.mapArea, { height: MAP_H }]}>
        <CityMapSvg w={cardW} h={MAP_H} />
        {/* Scan line */}
        <Animated.View
          style={[styles.scanLine, { width: cardW, transform: [{ translateY: scanTranslate }] }]}
        />
        {/* Bottom fade */}
        <View style={styles.mapFade} />
      </View>

      {/* Text content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.locationIcon}>📡</Text>
          <Text style={styles.title}>Local Tracking Active</Text>
        </View>
        <Text style={styles.body}>
          Your device is securely connected to the local dispatch network. Location data is only shared during an active SOS or while On-Duty.
        </Text>
        <View style={styles.chips}>
          <StatusChip label="GPS: High Accuracy" />
          <StatusChip label="Network: Stable" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  mapArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.35,
    top: 0,
  },
  mapFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: Colors.surfaceContainerLowest,
    opacity: 0.6,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationIcon: { fontSize: 20 },
  title: {
    ...Typography.headlineMd,
    fontSize: 18,
    color: Colors.onSurface,
  },
  body: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 4,
  },
});
