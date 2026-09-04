import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { SignInSheet } from "@/components/auth/SignInSheet";
import { deleteAccount, signOut, useAuth } from "@/data/auth";
import { settings as settingsRepo } from "@/data/repositories";
import { useUserSettings } from "@/data/store";
import { syncNow, useSyncStatus } from "@/sync/engine";
import { formatClock } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const status = useSyncStatus();
  const userSettings = useUserSettings();
  const [signInOpen, setSignInOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const lastSync = status.lastSyncAt
    ? `${status.lastSyncAt.slice(0, 10)} ${formatClock(status.lastSyncAt)}`
    : "never";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.sectionLabel}>Account</Text>
            {!auth.configured ? (
              <Text style={styles.value}>Sync is not set up on this build.</Text>
            ) : auth.status === "signed-in" ? (
              <>
                <Text style={styles.value}>{auth.email}</Text>
                <Text style={styles.meta}>
                  Sync {status.online ? "on" : "offline"} · {status.pending} pending · last {lastSync}
                </Text>
                {status.error ? <Text style={styles.error}>{status.error}</Text> : null}
                <Row label="Sync now" onPress={() => void syncNow()} />
                <Row label="Sign out" onPress={() => void signOut()} />
              </>
            ) : (
              <Row label="Sign in to sync" onPress={() => setSignInOpen(true)} />
            )}

            <Text style={styles.sectionLabel}>Display</Text>
            <View style={styles.switchRow}>
              <Text style={styles.value}>Project progress visible by default</Text>
              <Switch
                value={userSettings?.project_progress_visible ?? true}
                onValueChange={(next) => settingsRepo.update({ project_progress_visible: next })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.value}>Reduce motion</Text>
              <Switch
                value={userSettings?.reduce_motion ?? false}
                onValueChange={(next) => settingsRepo.update({ reduce_motion: next })}
              />
            </View>

            <Text style={styles.meta}>Notifications and export arrive in M5.</Text>

            {auth.status === "signed-in" ? (
              confirmDelete ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.value}>
                    Delete your account and cloud data permanently?
                  </Text>
                  <View style={styles.confirmRow}>
                    <Pressable
                      onPress={async () => {
                        setBusy(true);
                        try {
                          await deleteAccount();
                          onClose();
                        } catch {
                          setBusy(false);
                        }
                      }}
                      disabled={busy}
                      accessibilityRole="button"
                      style={styles.confirmDelete}
                    >
                      <Text style={styles.confirmDeleteText}>Delete account</Text>
                    </Pressable>
                    <Row label="Cancel" onPress={() => setConfirmDelete(false)} />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setConfirmDelete(true)}
                  accessibilityRole="button"
                  style={styles.row}
                >
                  <Text style={[styles.value, styles.danger]}>Delete account</Text>
                </Pressable>
              )
            ) : null}
          </ScrollView>
        </View>
      </View>

      {signInOpen ? <SignInSheet onClose={() => setSignInOpen(false)} /> : null}
    </Modal>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
      <Text style={styles.value}>{label}</Text>
    </Pressable>
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
    maxHeight: "88%",
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
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
  },
  row: {
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  danger: {
    color: "#662C2C",
  },
  confirmBox: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  confirmDelete: {
    backgroundColor: "#662C2C",
    borderRadius: radius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confirmDeleteText: {
    ...typography.button,
    color: colors.surface,
  },
});
