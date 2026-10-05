import type { ReactNode } from "react";
import { Modal } from "react-native";

export type OverlayProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * A transparent full-screen layer for menus. On native it is a plain fading
 * Modal; the web variant (Overlay.web.tsx) avoids react-native-web's Modal
 * focus trap, which would otherwise steal focus from an input a menu action
 * opens (and so keep the iPhone keyboard from appearing).
 */
export function Overlay({ visible, onRequestClose, children }: OverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
