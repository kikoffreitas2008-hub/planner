import { useEffect, useState } from "react";
import { AppState } from "react-native";

import type { ISODate } from "@/domain/date";
import { msUntilNextLisbonMidnight, todayInLisbon } from "@/lib/today";

/**
 * Today's Lisbon date, kept current while the app stays open: it ticks over at
 * midnight and is re-read whenever the app comes back to the foreground (an
 * iPhone PWA is often resumed days later rather than relaunched).
 */
export function useLisbonToday(): ISODate {
  const [today, setToday] = useState(() => todayInLisbon());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function refresh() {
      setToday(todayInLisbon());
      clearTimeout(timer);
      // A second of slack so the timer never fires a hair before midnight.
      timer = setTimeout(refresh, msUntilNextLisbonMidnight() + 1000);
    }
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
