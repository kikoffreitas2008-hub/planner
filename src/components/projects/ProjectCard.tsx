import { StyleSheet, Text, View } from "react-native";

import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { useProjectProgress } from "@/data/projects";
import type { Project } from "@/domain/entities";
import { palette, spacing, typography } from "@/theme/tokens";

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

  return (
    <Touchable variant="card" onPress={onPress} accessibilityLabel={project.title}>
      <GlossyCard color={project.color} style={{ width: size, height: size }}>
        <View style={[styles.body, !showProgress && styles.bodyCentered]}>
          <Text
            style={[compact ? styles.titleCompact : styles.title, { color: ink }]}
            numberOfLines={3}
          >
            {project.title}
          </Text>
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
