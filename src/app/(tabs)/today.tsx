import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { Divider } from "@/components/ui/Divider";
import { GlossyCard } from "@/components/ui/GlossyCard";
import { QuoteCard } from "@/components/ui/QuoteCard";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { colors, palette, spacing, typography, type PaletteKey } from "@/theme/tokens";

const PALETTE_KEYS = Object.keys(palette) as PaletteKey[];

function formatTodaySubtitle(now: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
  }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);
  return `${weekday} · ${date}`;
}

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  // Mobile-first: one card per row on a phone, two once there is room.
  const twoUp = width >= 640;

  return (
    <AppScreen
      title="Today"
      subtitle={formatTodaySubtitle(new Date())}
      headerRight={
        <>
          <RoundIconButton
            sf="person.crop.circle"
            ion="person-circle-outline"
            accessibilityLabel="Profile and settings"
          />
          <RoundIconButton sf="plus" ion="add" accessibilityLabel="Create" />
        </>
      }
    >
      <QuoteCard
        text="Your word is a lamp to my feet, and a light for my path."
        reference="Psalm 119:105"
      />

      <Divider />

      <Text style={styles.sectionHeading}>Palette check</Text>
      <Text style={styles.note}>
        One GlossyCard per palette colour. Compare the gradient, gloss and shadow
        against blueprint/assets/screenshots.
      </Text>

      <View style={styles.grid}>
        {PALETTE_KEYS.map((key) => (
          <GlossyCard
            key={key}
            color={key}
            size="task"
            style={twoUp ? styles.gridItemHalf : styles.gridItemFull}
          >
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: palette[key].ink }]}>
                {key[0].toUpperCase() + key.slice(1)}
              </Text>
              <Text style={[styles.cardMeta, { color: palette[key].ink }]}>
                {palette[key].start} → {palette[key].end}
              </Text>
            </View>
          </GlossyCard>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.xs,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridItemFull: {
    width: "100%",
  },
  gridItemHalf: {
    flexGrow: 1,
    flexBasis: "47%",
  },
  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitle: {
    ...typography.heading,
  },
  cardMeta: {
    ...typography.caption,
    opacity: 0.8,
  },
});
