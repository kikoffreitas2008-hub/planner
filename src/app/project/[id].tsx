import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ProjectItemList } from "@/components/projects/ProjectItemList";
import { ProjectSettingsSheet } from "@/components/projects/ProjectSettingsSheet";
import { StructuredTaskGrid } from "@/components/projects/StructuredTaskGrid";
import { BackBar } from "@/components/ui/BackBar";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { ZoomIn } from "@/components/ui/ZoomIn";
import { useProject, useProjectItems, useProjectProgress } from "@/data/projects";
import { useUserSettings } from "@/data/store";
import { formatDuration } from "@/domain/duration";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const project = useProject(id);
  const topLevel = useProjectItems(id, null);
  const progress = useProjectProgress(project);
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!project) {
    return (
      <View style={styles.screen}>
        <BackBar title="Project" />
        <Text style={styles.missing}>This project no longer exists.</Text>
      </View>
    );
  }

  const progressLabel =
    project.progress_mode === "time"
      ? `${formatDuration(progress.completed)} / ${formatDuration(progress.total)}`
      : `${progress.completed} / ${progress.total} done`;

  return (
    <View style={styles.screen}>
      <BackBar
        title={project.title}
        subtitle={progressLabel}
        right={
          <RoundIconButton
            sf="ellipsis"
            ion="ellipsis-horizontal"
            accessibilityLabel="Project settings"
            onPress={() => setSettingsOpen(true)}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <ZoomIn disabled={reduceMotion}>
          {project.mode === "structured" ? (
            <StructuredTaskGrid
              project={project}
              tasks={topLevel}
              onOpenTask={(taskId) => router.push({ pathname: "/task/[id]", params: { id: taskId } })}
            />
          ) : (
            <ProjectItemList project={project} parentId={null} items={topLevel} />
          )}
        </ZoomIn>
      </ScrollView>

      {settingsOpen ? (
        <ProjectSettingsSheet
          project={project}
          onClose={() => setSettingsOpen(false)}
          onArchivedOrDeleted={() => {
            setSettingsOpen(false);
            router.back();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: layoutTokens.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: layoutTokens.horizontalPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  missing: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
