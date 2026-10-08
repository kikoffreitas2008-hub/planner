import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TimeHistorySheet } from "@/components/time/TimeHistorySheet";
import { AREA_LABELS } from "@/components/time/TimeLogSheet";
import { Touchable } from "@/components/ui/Touchable";
import { useTimeBalances } from "@/data/timeLogs";
import { formatBalance, TIME_AREAS, type TimeArea } from "@/domain/timeTracker";
import { colors, palette, spacing, typography } from "@/theme/tokens";

const TONE_COLORS = {
  owed: palette.red.ink,
  ahead: palette.green.ink,
  even: colors.textSecondary,
} as const;

/** Live balance for each tracked area, under the project grid. */
export function TimeTrackerSection() {
  const balances = useTimeBalances();
  const [openArea, setOpenArea] = useState<TimeArea | null>(null);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Time</Text>
      {TIME_AREAS.map((area) => {
        const balance = formatBalance(balances[area]);
        return (
          <Touchable
            key={area}
            variant="row"
            onPress={() => setOpenArea(area)}
            accessibilityLabel={`${AREA_LABELS[area]}: ${balance.text}`}
            style={styles.row}
          >
            <Text style={styles.area}>{AREA_LABELS[area]}</Text>
            <Text style={[styles.balance, { color: TONE_COLORS[balance.tone] }]}>
              {balance.text}
            </Text>
          </Touchable>
        );
      })}

      {openArea ? <TimeHistorySheet area={openArea} onClose={() => setOpenArea(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  area: {
    ...typography.body,
    color: colors.text,
  },
  balance: {
    ...typography.button,
  },
});
