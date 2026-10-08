import { useMemo, useState } from "react";

import { AgendaFormModal, type AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { AgendaSection } from "@/components/agenda/AgendaSection";
import { OverdueReviewSheet } from "@/components/agenda/OverdueReviewSheet";
import { RememberSection } from "@/components/remember/RememberSection";
import { RoutineCard } from "@/components/routine/RoutineCard";
import { TimeLogSheet } from "@/components/time/TimeLogSheet";
import { GlobalSearchButton } from "@/components/search/GlobalSearchButton";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { AppScreen } from "@/components/ui/AppScreen";
import { Divider } from "@/components/ui/Divider";
import { PlusMenu } from "@/components/ui/PlusMenu";
import { QuoteCard } from "@/components/ui/QuoteCard";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { applyFormEdit, createFromForm, deleteAgendaItem, toggleAgendaComplete } from "@/data/agendaEdit";
import quotesData from "@/data/bible-quotes.en-US.json";
import { useOverdueCandidates } from "@/data/overdue";
import { remember } from "@/data/repositories";
import { useUnansweredDays } from "@/data/timeLogs";
import type { AgendaItem } from "@/domain/agenda";
import { quoteForLocalDate, type BibleQuote } from "@/domain/dailyQuote";
import type { ISODate } from "@/domain/date";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { primeKeyboard } from "@/lib/keyboardPrime";
import { formatDayHeading, nextDate } from "@/lib/today";
import { useLisbonToday } from "@/lib/useLisbonToday";

const QUOTES = quotesData as BibleQuote[];

type FormState =
  | null
  | { mode: "create"; itemType: "task" | "event" }
  | { mode: "edit"; item: AgendaItem };

export default function TodayScreen() {
  const realToday = useLisbonToday();
  const [viewDate, setViewDate] = useState(realToday);
  const [form, setForm] = useState<FormState>(null);
  const [routineAddSignal, setRoutineAddSignal] = useState(0);
  // Each review is put away for the day it was dismissed on, so a new day
  // brings it back even if the app was never closed.
  const [overdueDismissedOn, setOverdueDismissedOn] = useState<ISODate | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeLogDismissedOn, setTimeLogDismissedOn] = useState<ISODate | null>(null);

  const quote = useMemo(() => quoteForLocalDate(realToday, QUOTES), [realToday]);
  const overdue = useOverdueCandidates(realToday);
  const unanswered = useUnansweredDays(realToday);
  const overdueDismissed = overdueDismissedOn === realToday;
  const timeLogDismissed = timeLogDismissedOn === realToday;

  // A new day while the app stayed open: move the agenda to it.
  const [agendaDay, setAgendaDay] = useState(realToday);
  if (agendaDay !== realToday) {
    setAgendaDay(realToday);
    setViewDate(realToday);
  }
  const isPlanningTomorrow = viewDate !== realToday;

  function handleSubmit(result: AgendaFormResult, scope?: RecurrenceScope) {
    if (form?.mode === "edit") applyFormEdit(form.item, result, scope);
    else createFromForm(result);
    setForm(null);
  }

  function handleToggleComplete() {
    if (form?.mode === "edit") toggleAgendaComplete(form.item);
    setForm(null);
  }

  function handleDelete(scope?: RecurrenceScope) {
    if (form?.mode === "edit") deleteAgendaItem(form.item, scope);
    setForm(null);
  }

  return (
    <AppScreen
      title="Today"
      subtitle={
        isPlanningTomorrow
          ? `Planning · ${formatDayHeading(viewDate)}`
          : formatDayHeading(viewDate)
      }
      headerRight={
        <>
          <RoundIconButton
            sf="person.crop.circle"
            ion="person-circle-outline"
            accessibilityLabel="Profile and settings"
            onPress={() => setSettingsOpen(true)}
          />
          <GlobalSearchButton />
          <PlusMenu
            options={[
              {
                key: "todo",
                label: "New to-do",
                onPress: () => setForm({ mode: "create", itemType: "task" }),
              },
              {
                key: "event",
                label: "New event",
                onPress: () => setForm({ mode: "create", itemType: "event" }),
              },
              {
                key: "reminder",
                label: "New reminder",
                onPress: () => {
                  // Raise the iPhone keyboard now, inside the tap; the new
                  // card's input takes it over when it mounts.
                  primeKeyboard();
                  remember.create(viewDate, "");
                },
              },
              {
                key: "routine",
                label: "New routine item",
                onPress: () => setRoutineAddSignal((n) => n + 1),
              },
            ]}
          />
        </>
      }
    >
      <QuoteCard text={quote.text} reference={quote.reference} />

      <Divider />

      <AgendaSection
        date={viewDate}
        onEditItem={(item) => setForm({ mode: "edit", item })}
        isPlanningTomorrow={isPlanningTomorrow}
        onPlanTomorrow={() => setViewDate(nextDate(realToday))}
        onExitPlanTomorrow={() => setViewDate(realToday)}
      />

      <Divider />

      <RememberSection />

      <Divider />

      <RoutineCard addSignal={routineAddSignal} />

      {form ? (
        <AgendaFormModal
          visible
          defaultDate={viewDate}
          initial={form}
          onCancel={() => setForm(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onToggleComplete={handleToggleComplete}
        />
      ) : null}

      {overdue.length > 0 && !overdueDismissed ? (
        <OverdueReviewSheet
          candidates={overdue}
          today={realToday}
          onDone={() => setOverdueDismissedOn(realToday)}
        />
      ) : null}

      {/* After the overdue review, never on top of it. */}
      {unanswered.length > 0 &&
      !timeLogDismissed &&
      (overdue.length === 0 || overdueDismissed) ? (
        <TimeLogSheet days={unanswered} onClose={() => setTimeLogDismissedOn(realToday)} />
      ) : null}

      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
    </AppScreen>
  );
}
