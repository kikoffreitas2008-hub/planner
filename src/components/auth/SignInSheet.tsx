import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { sendCode, verifyCode } from "@/data/auth";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export function SignInSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail() {
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, code);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{step === "email" ? "Sign in" : "Enter the code"}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {step === "email" ? (
            <>
              <Text style={styles.hint}>We email a 6-digit code — no links, no password.</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                inputMode="email"
                style={styles.input}
              />
              <Action label="Send code" onPress={submitEmail} busy={busy} disabled={!email.includes("@")} />
            </>
          ) : (
            <>
              <Text style={styles.hint}>Sent to {email}.</Text>
              <TextInput
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 10))}
                placeholder="Code from the email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                inputMode="numeric"
                style={[styles.input, styles.code]}
              />
              <Action label="Verify" onPress={submitCode} busy={busy} disabled={code.length < 4} />
              <Pressable onPress={() => setStep("email")} accessibilityRole="button" style={styles.back}>
                <Text style={styles.backText}>Use a different email</Text>
              </Pressable>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function Action({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      style={[styles.button, (busy || disabled) && styles.buttonDisabled]}
    >
      {busy ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
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
    paddingVertical: spacing.sm,
  },
  code: {
    ...typography.title,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.button,
    color: colors.surface,
  },
  back: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
  },
});
