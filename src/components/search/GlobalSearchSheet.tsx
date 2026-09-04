import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { PlatformIcon, type PlatformIconProps } from "@/components/ui/PlatformIcon";
import { search, useSearchIndex, type SearchResult } from "@/data/search";
import { formatDayHeading, todayInLisbon } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  todo: "To-do",
  event: "Event",
  project: "Project",
  project_item: "Project item",
  remember: "Remember",
};

const KIND_ICON: Record<SearchResult["kind"], Pick<PlatformIconProps, "sf" | "ion">> = {
  todo: { sf: "checkmark.circle", ion: "checkmark-circle-outline" },
  event: { sf: "calendar", ion: "calendar-outline" },
  project: { sf: "square.grid.2x2", ion: "grid-outline" },
  project_item: { sf: "list.bullet", ion: "list-outline" },
  remember: { sf: "text.bubble", ion: "chatbox-outline" },
};

export function GlobalSearchSheet({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const index = useSearchIndex();
  const results = search(index, query);
  const router = useRouter();

  function open(result: SearchResult) {
    onClose();
    switch (result.kind) {
      case "todo":
      case "event": {
        if (result.date && result.date === todayInLisbon()) {
          router.push("/today");
        } else {
          router.push({ pathname: "/calendar", params: { date: result.date ?? "", view: "day" } });
        }
        return;
      }
      case "project":
        if (result.projectId) router.push({ pathname: "/project/[id]", params: { id: result.projectId } });
        return;
      case "project_item":
        if (result.taskId) router.push({ pathname: "/task/[id]", params: { id: result.taskId } });
        else if (result.projectId) router.push({ pathname: "/project/[id]", params: { id: result.projectId } });
        return;
      case "remember":
        router.push("/today");
        return;
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <PlatformIcon sf="magnifyingglass" ion="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search to-dos, events, projects, reminders"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={styles.input}
            />
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
            {query.trim() && results.length === 0 ? (
              <Text style={styles.empty}>No matches.</Text>
            ) : (
              results.map((result) => (
                <Pressable
                  key={result.id}
                  onPress={() => open(result)}
                  accessibilityRole="button"
                  style={styles.row}
                >
                  <PlatformIcon
                    sf={KIND_ICON[result.kind].sf}
                    ion={KIND_ICON[result.kind].ion}
                    size={18}
                    color={colors.textSecondary}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {result.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {KIND_LABEL[result.kind]}
                      {result.date ? ` · ${formatDayHeading(result.date)}` : ""}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    ...(Platform.OS === "web" ? { boxShadow: "0 16px 34px rgba(0,0,0,0.2)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  results: {
    padding: spacing.sm,
    gap: 2,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.md,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.medium,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
