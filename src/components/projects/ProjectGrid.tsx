import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { ProjectCard } from "@/components/projects/ProjectCard";
import type { Project } from "@/domain/entities";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

const GAP = spacing.md;
const TARGET_CARD = 190;
const MAX_CARD = 220;

export type ProjectGridProps = {
  projects: readonly Project[];
  showProgress: boolean;
  archivedCount: number;
  onOpenProject: (id: string) => void;
  onOpenArchived: () => void;
};

export function ProjectGrid({
  projects,
  showProgress,
  archivedCount,
  onOpenProject,
  onOpenArchived,
}: ProjectGridProps) {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(
    width - layoutTokens.horizontalPadding * 2,
    layoutTokens.contentMaxWidth,
  );
  // At least two per row on a phone; the card size never shrinks below itself
  // to cram more in (blueprint/01 §4.1) — extra room just adds columns.
  const columns = Math.max(2, Math.floor((containerWidth + GAP) / (TARGET_CARD + GAP)));
  const size = Math.min(MAX_CARD, (containerWidth - GAP * (columns - 1)) / columns);

  return (
    <View style={styles.wrap}>
      {projects.length === 0 ? (
        <Text style={styles.empty}>No projects yet. Tap + to start one.</Text>
      ) : (
        <View style={styles.grid}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              size={size}
              showProgress={showProgress}
              onPress={() => onOpenProject(project.id)}
            />
          ))}
        </View>
      )}

      <Pressable onPress={onOpenArchived} accessibilityRole="button" style={styles.archived}>
        <Text style={styles.archivedText}>Archived projects{archivedCount ? ` (${archivedCount})` : ""}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  archived: {
    paddingVertical: spacing.sm,
  },
  archivedText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
