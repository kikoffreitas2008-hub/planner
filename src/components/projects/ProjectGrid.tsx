import { useRef } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { DraggableGrid } from "@/components/projects/DraggableGrid";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Touchable } from "@/components/ui/Touchable";
import { projects as projectsRepo } from "@/data/repositories";
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

  // A drag that fails (moved before the hold completed) still releases like a
  // tap; this keeps it from opening the project (same as Remember cards).
  const suppressTapUntil = useRef<Record<string, number>>({});

  return (
    <View style={styles.wrap}>
      {projects.length === 0 ? (
        <Text style={styles.empty}>No projects yet. Tap + to start one.</Text>
      ) : (
        <DraggableGrid
          data={projects}
          cellSize={size}
          columns={columns}
          gap={GAP}
          onReorder={(orderedIds) => projectsRepo.applyOrder(orderedIds)}
          onDragAttempt={(id) => {
            suppressTapUntil.current[id] = Date.now() + 400;
          }}
          renderItem={(project) => (
            <ProjectCard
              project={project}
              size={size}
              showProgress={showProgress}
              onPress={() => {
                if ((suppressTapUntil.current[project.id] ?? 0) > Date.now()) return;
                onOpenProject(project.id);
              }}
              // Holding a card is only for reordering; a long-press handler
              // makes Pressable skip `onPress` when the held card is let go.
              onLongPress={() => {}}
            />
          )}
        />
      )}

      <Touchable variant="row" onPress={onOpenArchived} style={styles.archived}>
        <Text style={styles.archivedText}>Archived projects{archivedCount ? ` (${archivedCount})` : ""}</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
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
