import { StyleSheet, Text, View } from "react-native";

import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { useProjectProgress } from "@/data/projects";
import type { Project } from "@/domain/entities";
import { fitTitleSize, MIN_TITLE_SIZE } from "@/domain/fitText";
import { palette, spacing, typography } from "@/theme/tokens";

const TITLE_LINES = 3;
/** Centred text may run this far into the card's padding on each side. */
const TITLE_BLEED = spacing.xs;

export type ProjectCardProps = {
  project: Project;
  size: number;
  showProgress: boolean;
  onPress: () => void;
  /** Smaller type for the structured task grid. */
  compact?: boolean;
};

export function ProjectCard({ project, size, showProgress, onPress, compact }: ProjectCardProps) {
  const progress = useProjectProgress(project);
  const ink = palette[project.color].ink;

  // Size the name to the card so no word is broken across lines.
  const base = compact ? typography.heading : styles.title;
  const lineWidth = size - spacing.lg * 2 + TITLE_BLEED * 2;
  const fitted = fitTitleSize({
    title: project.title,
    width: lineWidth,
    maxSize: base.fontSize,
    minSize: MIN_TITLE_SIZE,
    maxLines: TITLE_LINES,
    lineHeightRatio: base.lineHeight / base.fontSize,
  });

  return (
    <Touchable variant="card" onPress={onPress} accessibilityLabel={project.title}>
      <GlossyCard color={project.color} style={{ width: size, height: size }}>
        <View style={[styles.body, !showProgress && styles.bodyCentered]}>
          {/* The width sits on a View: a numberOfLines Text on web is capped at
              its parent's width, which would cancel the bleed into the padding. */}
          <View style={{ width: lineWidth }}>
            <Text
              style={[compact ? styles.titleCompact : styles.title, fitted, { color: ink }]}
              numberOfLines={TITLE_LINES}
            >
              {project.title}
            </Text>
          </View>
          {showProgress ? (
            <ProgressBar
              progress={progress}
              mode={project.progress_mode}
              tone="ink"
              inkColor={ink}
            />
          ) : null}
        </View>
      </GlossyCard>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  bodyCentered: {
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 29,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  titleCompact: {
    ...typography.heading,
    textAlign: "center",
  },
});
