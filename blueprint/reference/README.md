# Reference code

Working code lifted from the previous build. Three different levels of trust:

## `domain/` — reuse this

Pure TypeScript. No React, no React Native, no database, no network. It encodes the rules
that are genuinely hard to get right and were already tested:

| file | what it settles |
| --- | --- |
| `recurrence.ts` | expanding daily / weekdays / weekly / monthly / custom rules, with end conditions and month-end handling |
| `recurrenceMutation.ts` | the three edit scopes — this occurrence, this and following, whole series |
| `timeRange.ts` | validating start/end, crossing midnight, and converting wall-clock Lisbon time to UTC across DST |
| `date.ts` | ISO date and datetime types and guards, client id generation |
| `duration.ts` | parsing `90`, `90min`, `1h30`, `1:30`; formatting; totals |
| `progress.ts` | progress by count and by time, including which items are eligible in structured projects |
| `projectOrder.ts` | importance ordering and fractional-index manual ordering |
| `overdue.ts` | which items qualify for the overdue review, and reschedule validation |
| `dailyQuote.ts` | picking the day's verse deterministically from the local date |
| `timelineLayout.ts` | laying overlapping calendar items out side by side |
| `agenda.ts` | the shape of a merged agenda entry |
| `entities.ts` | the entity types |
| `calendarGrid.ts` | month grid construction, weeks starting Monday |
| `notificationSchedule.ts` | choosing which future alerts to schedule within the iOS 64-notification limit |

Imports use the `@/` alias (`@/domain/date`) — keep the same alias or rewrite the paths.

Read these before writing equivalents. They are the reason the rebuild should be faster
than the original.

## `tokens.ts` and `GlossyCard.tsx` — copy these

The approved visual system as code. See `../02-design-system.md`.

## `sql/` — read, do not copy

The previous Supabase migrations, in order. Useful for column types, RLS policy shape and
the account-deletion function. They assume PowerSync and a local SQLite mirror, which this
build does not have, so treat them as a reference rather than a starting point.
