import { useMemo, useState } from "react";

import { AgendaFormModal, type AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { AgendaSection } from "@/components/agenda/AgendaSection";
import { AppScreen } from "@/components/ui/AppScreen";
import { Divider } from "@/components/ui/Divider";
import { PlusMenu } from "@/components/ui/PlusMenu";
import { QuoteCard } from "@/components/ui/QuoteCard";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import quotesData from "@/data/bible-quotes.en-US.json";
import { calendarItems } from "@/data/repositories";
import type { AgendaItem } from "@/domain/agenda";
import { quoteForLocalDate, type BibleQuote } from "@/domain/dailyQuote";
import { formatDayHeading, todayInLisbon } from "@/lib/today";

const QUOTES = quotesData as BibleQuote[];

type FormState =
  | null
  | { mode: "create"; itemType: "task" | "event" }
  | { mode: "edit"; item: AgendaItem };

export default function TodayScreen() {
  const date = todayInLisbon();
  const quote = useMemo(() => quoteForLocalDate(date, QUOTES), [date]);
  const [form, setForm] = useState<FormState>(null);

  function handleSubmit(result: AgendaFormResult) {
    if (form?.mode === "edit" && form.item.origin.kind === "calendar") {
      calendarItems.update(form.item.origin.id, {
        title: result.title,
        notes: result.notes,
        date: result.date,
        all_day: result.all_day,
        starts_at: result.starts_at,
        ends_at: result.ends_at,
        color: result.color,
      });
    } else {
      calendarItems.create(result);
    }
    setForm(null);
  }

  return (
    <AppScreen
      title="Today"
      subtitle={formatDayHeading(date)}
      headerRight={
        <>
          <RoundIconButton
            sf="person.crop.circle"
            ion="person-circle-outline"
            accessibilityLabel="Profile and settings"
          />
          <PlusMenu
            options={[
              { key: "todo", label: "New to-do", onPress: () => setForm({ mode: "create", itemType: "task" }) },
              { key: "event", label: "New event", onPress: () => setForm({ mode: "create", itemType: "event" }) },
              { key: "reminder", label: "New reminder", onPress: () => {}, disabled: true },
              { key: "routine", label: "New routine item", onPress: () => {}, disabled: true },
            ]}
          />
        </>
      }
    >
      <QuoteCard text={quote.text} reference={quote.reference} />

      <Divider />

      <AgendaSection date={date} onEditItem={(item) => setForm({ mode: "edit", item })} />

      {form ? (
        <AgendaFormModal
          visible
          defaultDate={date}
          initial={form}
          onCancel={() => setForm(null)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </AppScreen>
  );
}
