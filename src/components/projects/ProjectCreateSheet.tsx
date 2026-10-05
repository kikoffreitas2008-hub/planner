import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { Touchable } from "@/components/ui/Touchable";
import { projects } from "@/data/repositories";
import { colors, radius, shadow, spacing, typography, type PaletteKey } from "@/theme/tokens";

export type ProjectCreateSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function ProjectCreateSheet({ visible, onClose, onCreated }: ProjectCreateSheetProps) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"simple" | "structured">("simple");
  const [progressMode, setProgressMode] = useState<"items" | "time">("items");
  const [color, setColor] = useState<PaletteKey>("blue");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setMode("simple");
    setProgressMode("items");
    setColor("blue");
    setError(null);
  }

  function create() {
    if (!title.trim()) {
      setError("Give the project a name.");
      return;
    }
    const project = projects.create({
      title: title.trim(),
      mode,
      color,
      progress_mode: progressMode,
    });
    reset();
    onCreated(project.id);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        reset();
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close"
          onPress={() => {
            reset();
            onClose();
          }}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New project</Text>
            <Touchable
              onPress={() => {
                reset();
                onClose();
              }}
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <View style={styles.form}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Project name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <Segmented
              label="Type"
              options={[
                { key: "simple", label: "Simple" },
                { key: "structured", label: "Structured" },
              ]}
              value={mode}
              onChange={(next) => setMode(next as "simple" | "structured")}
            />
            <Text style={styles.hint}>
              {mode === "simple"
                ? "Opens straight to a list of items."
                : "Opens to a grid of tasks, each with its own subtasks."}
            </Text>

            <Segmented
              label="Progress"
              options={[
                { key: "items", label: "By count" },
                { key: "time", label: "By time" },
              ]}
              value={progressMode}
              onChange={(next) => setProgressMode(next as "items" | "time")}
            />

            <Text style={styles.fieldLabel}>Colour</Text>
            <ColorSwatches value={color} onChange={setColor} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Touchable onPress={create} haptic="success" style={styles.createButton}>
              <Text style={styles.createText}>Create</Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segment}>
        {options.map((option) => (
          <Touchable
            key={option.key}
            haptic="selection"
            onPress={() => onChange(option.key)}
            accessibilityState={{ selected: value === option.key }}
            style={[styles.segmentButton, value === option.key && styles.segmentButtonActive]}
          >
            <Text
              style={[styles.segmentText, value === option.key && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
          </Touchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    paddingBottom: spacing.xl,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  form: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xxs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
  },
  createButton: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  createText: {
    ...typography.button,
    color: colors.surface,
  },
});
