import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ProjectItemList } from "@/components/projects/ProjectItemList";
import { BackBar } from "@/components/ui/BackBar";
import { ColorDot } from "@/components/ui/ColorDot";
import { ColorPickerSheet } from "@/components/ui/ColorPickerSheet";
import { ZoomIn } from "@/components/ui/ZoomIn";
import { useArchivedProjectItems, useProject, useProjectItems } from "@/data/projects";
import { projectItems } from "@/data/repositories";
import { useTable, useUserSettings } from "@/data/store";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export default function SubtaskListScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const task = useTable("project_items")[taskId];
  const project = useProject(task?.project_id);
  const subtasks = useProjectItems(task?.project_id, taskId);
  const archived = useArchivedProjectItems(task?.project_id, taskId);
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const [colorOpen, setColorOpen] = useState(false);

  if (!project || !task) {
    return (
      <View style={styles.screen}>
        <BackBar title="Task" />
        <Text style={styles.missing}>This task no longer exists.</Text>
      </View>
    );
  }

  // Archived subtasks are off the list but still done.
  const doneCount = subtasks.filter((item) => item.completed_at).length + archived.length;
  const totalCount = subtasks.length + archived.length;
  const color = task.color ?? project.color;

  return (
    <View style={styles.screen}>
      <BackBar
        title={task.title}
        subtitle={`${project.title} · ${doneCount} / ${totalCount} done`}
        right={
          <ColorDot
            color={color}
            size={22}
            onPress={() => setColorOpen(true)}
            accessibilityLabel={`Change task colour (currently ${color})`}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ZoomIn disabled={reduceMotion}>
          <ProjectItemList project={project} parentId={taskId} items={subtasks} />
        </ZoomIn>
      </ScrollView>

      <ColorPickerSheet
        visible={colorOpen}
        value={color}
        onPick={(next) => projectItems.update(task.id, { color: next })}
        onClose={() => setColorOpen(false)}
      />
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
