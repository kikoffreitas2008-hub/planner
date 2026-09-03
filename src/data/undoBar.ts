import { useSyncExternalStore } from "react";

export interface UndoBarState {
  visible: boolean;
  message: string;
}

interface Pending {
  message: string;
  onUndo: () => void;
  onCommit: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const HIDDEN: UndoBarState = { visible: false, message: "" };
const WINDOW_MS = 5000;

let state: UndoBarState = HIDDEN;
let pending: Pending | null = null;
const listeners = new Set<() => void>();

function emit(next: UndoBarState): void {
  state = next;
  for (const listener of listeners) listener();
}

function commitPending(): void {
  if (!pending) return;
  clearTimeout(pending.timer);
  pending.onCommit();
  pending = null;
}

/**
 * Show the bottom "… — Undo" bar for one deletion. Any previous pending
 * deletion is committed immediately. `onUndo` restores the row; `onCommit`
 * runs when the window closes (write the tombstone there).
 */
export function offerUndo(message: string, onUndo: () => void, onCommit: () => void): void {
  commitPending();
  const timer = setTimeout(() => {
    pending = null;
    emit(HIDDEN);
    onCommit();
  }, WINDOW_MS);
  pending = { message, onUndo, onCommit, timer };
  emit({ visible: true, message });
}

export function undoLast(): void {
  if (!pending) return;
  clearTimeout(pending.timer);
  const { onUndo } = pending;
  pending = null;
  emit(HIDDEN);
  onUndo();
}

export function dismissUndo(): void {
  commitPending();
  emit(HIDDEN);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUndoBar(): UndoBarState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
