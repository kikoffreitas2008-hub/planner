import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ProjectItemList } from "@/components/projects/ProjectItemList";
import { BackBar } from "@/components/ui/BackBar";
import { useProject, useProjectItems } from "@/data/projects";
import { useTable } from "@/data/store";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export default function SubtaskListScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const task = useTable("project_items")[taskId];
  const project = useProject(task?.project_id);
  const subtasks = useProjectItems(task?.project_id, taskId);

  if (!project || !task) {
    return (
      <View style={styles.screen}>
        <BackBar title="Task" />
        <Text style={styles.missing}>This task no longer exists.</Text>
      </View>
    );
  }

  const doneCount = subtasks.filter((item) => item.completed_at).length;

  return (
    <View style={styles.screen}>
      <BackBar
        title={task.title}
        subtitle={`${project.title} · ${doneCount} / ${subtasks.length} done`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ProjectItemList project={project} parentId={taskId} items={subtasks} />
      </ScrollView>
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
