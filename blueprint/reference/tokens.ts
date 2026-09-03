export const colorScheme = "light" as const;

export const palette = Object.freeze({
  blue: Object.freeze({
    start: "#9FCCFF",
    end: "#EAF5FF",
    ink: "#173B64",
  }),
  green: Object.freeze({
    start: "#AEE8C3",
    end: "#EFFAF3",
    ink: "#17472A",
  }),
  pink: Object.freeze({
    start: "#F4B7D2",
    end: "#FFF0F7",
    ink: "#633047",
  }),
  purple: Object.freeze({
    start: "#C9B7F6",
    end: "#F4F0FF",
    ink: "#3F3268",
  }),
  red: Object.freeze({
    start: "#F4B2B2",
    end: "#FFF0F0",
    ink: "#662C2C",
  }),
  orange: Object.freeze({
    start: "#F6C594",
    end: "#FFF4E9",
    ink: "#673E1A",
  }),
  yellow: Object.freeze({
    start: "#F3DF96",
    end: "#FFF9E6",
    ink: "#5D4B16",
  }),
});

export type PaletteKey = keyof typeof palette;

export const colors = Object.freeze({
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#111113",
  textSecondary: "#68686E",
  divider: "#D8D8DC",
  mutedSurface: "rgba(118, 118, 128, 0.12)",
  blackGlossStart: "#08080A",
  blackGlossEnd: "#242428",
  whiteHighlight: "rgba(255, 255, 255, 0.52)",
  whiteGloss: "rgba(255, 255, 255, 0.32)",
});

export const typography = Object.freeze({
  title: Object.freeze({ fontSize: 36, lineHeight: 42, fontWeight: "800" }),
  heading: Object.freeze({ fontSize: 23, lineHeight: 29, fontWeight: "700" }),
  body: Object.freeze({ fontSize: 17, lineHeight: 23, fontWeight: "600" }),
  caption: Object.freeze({ fontSize: 13, lineHeight: 17, fontWeight: "600" }),
  button: Object.freeze({ fontSize: 16, lineHeight: 20, fontWeight: "700" }),
});

export const spacing = Object.freeze({
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
});

export const radius = Object.freeze({
  small: 12,
  medium: 18,
  large: 24,
  pill: 999,
});

export const shadow = Object.freeze({
  card: Object.freeze({
    shadowColor: "#1E1E22",
    shadowOffset: Object.freeze({ width: 0, height: 8 }),
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  }),
  floating: Object.freeze({
    shadowColor: "#000000",
    shadowOffset: Object.freeze({ width: 0, height: 12 }),
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  }),
});

export const motion = Object.freeze({
  quick: 160,
  standard: 260,
  deliberate: 420,
  springDamping: 20,
  springStiffness: 190,
});

export const cardTokens = Object.freeze({
  gradientAngle: 135,
  gradientStart: Object.freeze({ x: 0, y: 0.88 }),
  gradientEnd: Object.freeze({ x: 1, y: 0.12 }),
  glossCenterX: 0.6,
  glossOpacity: 0.34,
  innerHighlightOpacity: 0.62,
});

export const layoutTokens = Object.freeze({
  contentMaxWidth: 760,
  horizontalPadding: 20,
  quoteMinHeight: 210,
  taskMinHeight: 120,
  projectMinHeight: 168,
  rememberHeight: 48,
  dividerWidth: "72%" as const,
  dividerMaxWidth: 180,
});

export type Theme = Readonly<{
  colors: typeof colors;
  palette: typeof palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  motion: typeof motion;
  cards: typeof cardTokens;
  layout: typeof layoutTokens;
}>;

export const theme: Theme = Object.freeze({
  colors,
  palette,
  typography,
  spacing,
  radius,
  shadow,
  motion,
  cards: cardTokens,
  layout: layoutTokens,
});
