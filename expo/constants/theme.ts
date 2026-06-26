import { Platform, TextStyle, ViewStyle } from "react-native";

/**
 * Gather — dark-only, Netflix-inspired theme.
 * Deep black canvas, contrasted poster cards, vivid red accent, rare gold highlights.
 */
export const colors = {
  // Canvas
  bg: "#141416",
  bgDeep: "#0B0B0C",
  bgElevated: "#1B1B1E",

  // Surfaces
  card: "#1C1C1F",
  cardElevated: "#242428",
  surface: "#2A2A2E",

  // Lines
  border: "#303034",
  borderStrong: "#3D3D42",

  // Text
  text: "#F7F7F7",
  textMuted: "#9B9BA2",
  textFaint: "#67676E",

  // Brand
  primary: "#EF233C",
  primaryDark: "#C2182C",
  primarySoft: "rgba(239,35,60,0.14)",
  primaryFg: "#FFFFFF",

  // Highlights
  accent: "#CDBE57",
  accentSoft: "rgba(205,190,87,0.16)",

  // Status
  success: "#3DD27E",
  successSoft: "rgba(61,210,126,0.14)",
  warning: "#E8A13A",
  destructive: "#E63946",
  destructiveSoft: "rgba(230,57,70,0.16)",

  // Misc
  overlay: "rgba(0,0,0,0.6)",
  scrim: "rgba(10,10,12,0.92)",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

const fontFamily = Platform.select({ ios: "System", android: "sans-serif", default: "System" });

export const fonts = {
  black: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  family: fontFamily,
} as const;

export const type = {
  display: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
    color: colors.text,
  } satisfies TextStyle,
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800" as const,
    letterSpacing: -0.6,
    color: colors.text,
  } satisfies TextStyle,
  h2: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    color: colors.text,
  } satisfies TextStyle,
  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500" as const,
    color: colors.text,
  } satisfies TextStyle,
  bodyMuted: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500" as const,
    color: colors.textMuted,
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600" as const,
    color: colors.textMuted,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
    color: colors.textFaint,
  } satisfies TextStyle,
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
    color: colors.textFaint,
  } satisfies TextStyle,
} as const;

export const shadows = {
  poster: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  } satisfies ViewStyle,
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  } satisfies ViewStyle,
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  } satisfies ViewStyle,
} as const;

export const theme = { colors, radius, spacing, type, shadows, fonts } as const;
export type Theme = typeof theme;
