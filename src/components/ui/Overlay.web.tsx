import { useEffect } from "react";
import { createPortal } from "react-dom";
import { StyleSheet, View } from "react-native";

import type { OverlayProps } from "./Overlay";

/**
 * Web: a fixed layer portalled to <body>. Unlike react-native-web's Modal it
 * has no focus trap and restores no focus when it closes, so a menu action can
 * focus an input elsewhere on the page (e.g. a new reminder) and keep it.
 */
export function Overlay({ visible, onRequestClose, children }: OverlayProps) {
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onRequestClose]);

  if (!visible || typeof document === "undefined") return null;
  return createPortal(<View style={styles.layer}>{children}</View>, document.body);
}

const styles = StyleSheet.create({
  layer: {
    // `fixed` is valid on web; React Native's types only know absolute/relative.
    position: "fixed" as "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
});
