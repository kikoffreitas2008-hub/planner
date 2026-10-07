import { useMemo, useState } from "react";

import { AgendaFormModal, type AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { AgendaSection } from "@/components/agenda/AgendaSection";
import { OverdueReviewSheet } from "@/components/agenda/OverdueReviewSheet";
import { RememberSection } from "@/components/remember/RememberSection";
import { RoutineCard } from "@/components/routine/RoutineCard";
import { GlobalSearchButton } from "@/components/search/GlobalSearchButton";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { AppScreen } from "@/components/ui/AppScreen";
import { Divider } from "@/components/ui/Divider";
import { PlusMenu } from "@/components/ui/PlusMenu";
import { QuoteCard } from "@/components/ui/QuoteCard";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { applyFormEdit, createFromForm, deleteAgendaItem } from "@/data/agendaEdit";
import quotesData from "@/data/bible-quotes.en-US.json";
import { useOverdueCandidates } from "@/data/overdue";
import { remember } from "@/data/repositories";
import type { AgendaItem } from "@/domain/agenda";
import { quoteForLocalDate, type BibleQuote } from "@/domain/dailyQuote";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { primeKeyboard } from "@/lib/keyboardPrime";
import { formatDayHeading, nextDate, todayInLisbon } from "@/lib/today";

const QUOTES = quotesData as BibleQuote[];

type FormState =
  | null
  | { mode: "create"; itemType: "task" | "event" }
  | { mode: "edit"; item: AgendaItem };

export default function TodayScreen() {
  const realToday = todayInLisbon();
  const [viewDate, setViewDate] = useState(realToday);
  const [form, setForm] = useState<FormState>(null);
  const [routineAddSignal, setRoutineAddSignal] = useState(0);
  const [overdueDismissed, setOverdueDismissed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const quote = useMemo(() => quoteForLocalDate(realToday, QUOTES), [realToday]);
  const overdue = useOverdueCandidates(realToday);
  const isPlanningTomorrow = viewDate !== realToday;

  function handleSubmit(result: AgendaFormResult, scope?: RecurrenceScope) {
    if (form?.mode === "edit") applyFormEdit(form.item, result, scope);
    else createFromForm(result);
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
        />
      ) : null}

      {overdue.length > 0 && !overdueDismissed ? (
        <OverdueReviewSheet
          candidates={overdue}
          today={realToday}
          onDone={() => setOverdueDismissed(true)}
        />
      ) : null}

      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
    </AppScreen>
  );
}
