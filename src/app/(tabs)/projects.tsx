import { useState } from "react";
import { useRouter } from "expo-router";

import { ArchivedProjectsSheet } from "@/components/projects/ArchivedProjectsSheet";
import { ProjectCreateSheet } from "@/components/projects/ProjectCreateSheet";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProgressToggle, useProgressVisible } from "@/components/projects/ProgressToggle";
import { GlobalSearchButton } from "@/components/search/GlobalSearchButton";
import { AppScreen } from "@/components/ui/AppScreen";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { useActiveProjects, useArchivedProjects } from "@/data/projects";

export default function ProjectsScreen() {
  const router = useRouter();
  const active = useActiveProjects();
  const archived = useArchivedProjects();
  const showProgress = useProgressVisible();

  const [createOpen, setCreateOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
    <AppScreen
      title="Projects"
      headerRight={
        <>
          <ProgressToggle />
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
          // Closing this sheet and pushing the project screen in the same
          // tick races the sheet's exit transition against the new screen's
          // ZoomIn entrance (both Reanimated `entering`/`exiting` on web);
          // losing that race once left the destination screen's content at
          // 0x0 (invisible) until a reload. Pushing a frame later lets the
          // sheet's teardown finish first.
          requestAnimationFrame(() => {
            router.push({ pathname: "/project/[id]", params: { id } });
          });
        }}
      />

      {archivedOpen ? <ArchivedProjectsSheet onClose={() => setArchivedOpen(false)} /> : null}
    </AppScreen>
  );
}
