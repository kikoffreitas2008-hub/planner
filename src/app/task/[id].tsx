import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ProjectItemList } from "@/components/projects/ProjectItemList";
import { TaskSettingsSheet } from "@/components/projects/TaskSettingsSheet";
import { BackBar } from "@/components/ui/BackBar";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { ZoomIn } from "@/components/ui/ZoomIn";
import {
  useArchivedProjectItems,
  useProject,
  useProjectItems,
} from "@/data/projects";
import { useTable, useUserSettings } from "@/data/store";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export default function SubtaskListScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const task = useTable("project_items")[taskId];
  const project = useProject(task?.project_id);
  const subtasks = useProjectItems(task?.project_id, taskId);
  const archived = useArchivedProjectItems(task?.project_id, taskId);
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!project || !task || task.deleted_at) {
    return (
      <View style={styles.screen}>
        <BackBar title="Task" />
        <Text style={styles.missing}>This task no longer exists.</Text>
      </View>
    );
  }

  // Archived subtasks are off the list but still done.
  const doneCount =
    subtasks.filter((item) => item.completed_at).length + archived.length;
  const totalCount = subtasks.length + archived.length;
  return (
    <View style={styles.screen}>
      <BackBar
        title={task.title}
        subtitle={`${project.title} · ${doneCount} / ${totalCount} done`}
        right={
          <RoundIconButton
            sf="ellipsis"
            ion="ellipsis-horizontal"
            accessibilityLabel="Task settings"
            onPress={() => setSettingsOpen(true)}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ZoomIn disabled={reduceMotion}>
          <ProjectItemList
            project={project}
            parentId={taskId}
            items={subtasks}
          />
        </ZoomIn>
      </ScrollView>

      {settingsOpen ? (
        <TaskSettingsSheet
          project={project}
          task={task}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => {
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
