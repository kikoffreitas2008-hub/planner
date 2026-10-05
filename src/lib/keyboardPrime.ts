import { Platform } from "react-native";

// iOS Safari (and the installed PWA) only raises the keyboard when an input is
// focused synchronously inside a tap handler. When the input a tap creates only
// mounts after a render, focus it then and the keyboard never appears. The
// usual workaround: focus an invisible stand-in input during the tap, so the
// keyboard is already up, then hand focus to the real input once it mounts —
// iOS keeps the keyboard when focus moves between inputs.

let proxy: HTMLInputElement | null = null;
let fallback: ReturnType<typeof setTimeout> | null = null;

/** Call synchronously from a press handler that is about to create an input. Web only. */
export function primeKeyboard(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  releaseKeyboard();
  const input = document.createElement("input");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  // 16px stops iOS zooming in on focus; fixed + transparent keeps it out of sight.
  input.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;";
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  proxy = input;
  // If the real input never mounts, don't leave a stray focused field behind.
  fallback = setTimeout(releaseKeyboard, 1500);
}

/** Call right after the real input has taken focus. Safe to call any time. */
export function releaseKeyboard(): void {
  if (fallback) clearTimeout(fallback);
  fallback = null;
  proxy?.remove();
  proxy = null;
}
