import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { ArchivedProjectsSheet } from "@/components/projects/ArchivedProjectsSheet";
import { ProjectCreateSheet } from "@/components/projects/ProjectCreateSheet";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { GlobalSearchButton } from "@/components/search/GlobalSearchButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { useActiveProjects, useArchivedProjects } from "@/data/projects";
import { settings } from "@/data/repositories";
import { useUserSettings } from "@/data/store";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function ProjectsScreen() {
  const router = useRouter();
  const active = useActiveProjects();
  const archived = useArchivedProjects();
  const userSettings = useUserSettings();
  const showProgress = userSettings?.project_progress_visible ?? true;

  const [createOpen, setCreateOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
    <AppScreen
      title="Projects"
      headerRight={
        <>
          <Pressable
            onPress={() => settings.update({ project_progress_visible: !showProgress })}
            accessibilityRole="button"
            accessibilityState={{ selected: showProgress }}
            style={[styles.toggle, showProgress && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, showProgress && styles.toggleTextOn]}>Progress</Text>
          </Pressable>
          <GlobalSearchButton />
          <RoundIconButton
            sf="plus"
            ion="add"
            accessibilityLabel="New project"
            onPress={() => setCreateOpen(true)}
          />
        </>
      }
    >
      <ProjectGrid
        projects={active}
        showProgress={showProgress}
        archivedCount={archived.length}
        onOpenProject={(id) => router.push({ pathname: "/project/[id]", params: { id } })}
        onOpenArchived={() => setArchivedOpen(true)}
      />

      <ProjectCreateSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push({ pathname: "/project/[id]", params: { id } });
        }}
      />

      {archivedOpen ? <ArchivedProjectsSheet onClose={() => setArchivedOpen(false)} /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.mutedSurface,
  },
  toggleOn: {
    backgroundColor: colors.text,
  },
  toggleText: {
    ...typography.button,
    color: colors.text,
  },
  toggleTextOn: {
    color: colors.surface,
  },
});
