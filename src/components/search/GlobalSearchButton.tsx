import { useState } from "react";

import { GlobalSearchSheet } from "@/components/search/GlobalSearchSheet";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

/**
 * The search entry point for a tab header. The spec's primary gesture is
 * pulling down at the very top of a scrolled-to-top list; this button is the
 * always-visible, keyboard- and VoiceOver-reachable equivalent — the same
 * "every gesture needs one" principle the app already applies to swipes
 * (blueprint/01 §9).
 */
export function GlobalSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <RoundIconButton
        sf="magnifyingglass"
        ion="search"
        accessibilityLabel="Search"
        onPress={() => setOpen(true)}
      />
      {open ? <GlobalSearchSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
