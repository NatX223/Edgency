// ─── Edgency Design Tokens ───────────────────────────────────────────────────
// Source: DESIGN.md

export const Colors = {
  // Surfaces
  surface: '#131313',
  surfaceDim: '#131313',
  surfaceBright: '#393939',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceVariant: '#353534',
  surfaceTint: '#ffb4a3',

  // On-surface
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#dec0b9',
  inverseSurface: '#e5e2e1',
  inverseOnSurface: '#313030',

  // Outlines
  outline: '#a68b84',
  outlineVariant: '#57423d',

  // Primary (Sunset Coral)
  primary: '#ffb4a3',
  onPrimary: '#621000',
  primaryContainer: '#ff7e5f',
  onPrimaryContainer: '#721702',
  inversePrimary: '#a53b22',
  primaryFixed: '#ffdad2',
  primaryFixedDim: '#ffb4a3',
  onPrimaryFixed: '#3d0700',
  onPrimaryFixedVariant: '#84240d',

  // Secondary (Deep Slate)
  secondary: '#c1c8ca',
  onSecondary: '#2b3234',
  secondaryContainer: '#434a4c',
  onSecondaryContainer: '#b2babc',
  secondaryFixed: '#dde4e6',
  secondaryFixedDim: '#c1c8ca',
  onSecondaryFixed: '#161d1f',
  onSecondaryFixedVariant: '#41484a',

  // Tertiary (Safety Indigo)
  tertiary: '#c5c0ff',
  onTertiary: '#2500a2',
  tertiaryContainer: '#9f98ff',
  onTertiaryContainer: '#2d00bd',
  tertiaryFixed: '#e3dfff',
  tertiaryFixedDim: '#c5c0ff',
  onTertiaryFixed: '#140067',
  onTertiaryFixedVariant: '#3b22c8',

  // Error
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // Background
  background: '#131313',
  onBackground: '#e5e2e1',

  // Semantic
  success: '#00B894',
  danger:  '#ff4444',
  warning: '#f5a623',
} as const;

export const Typography = {
  headlineXl: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.02 * 48,
  },
  headlineLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.01 * 32,
  },
  headlineLgMobile: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  labelMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.01 * 14,
  },
  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05 * 12,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 40,
  base: 8,
  gutter: 16,
  marginMobile: 20,
  marginDesktop: 64,
} as const;

export const Radii = {
  sm: 8,
  default: 16,
  md: 24,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;
