import type { RecurrenceRule } from "@/domain/recurrence";

export type RuleKind = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "custom";

export function parseRule(json: string | null): RecurrenceRule | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as RecurrenceRule;
  } catch {
    return null;
  }
}

export function ruleKind(rule: RecurrenceRule | null): RuleKind {
  if (!rule) return "none";
  if (rule.frequency === "custom") return "custom";
  return rule.frequency;
}

export function buildRule(kind: RuleKind, interval: number, end: RecurrenceRule["end"]): RecurrenceRule | null {
  switch (kind) {
    case "none":
      return null;
    case "custom":
      return { frequency: "custom", interval: Math.max(1, interval), end };
    default:
      return { frequency: kind, interval: 1, end };
  }
}

export function describeRule(rule: RecurrenceRule | null): string {
  if (!rule) return "Does not repeat";
  const base =
    rule.frequency === "daily"
      ? "Every day"
      : rule.frequency === "weekdays"
        ? "Every weekday"
        : rule.frequency === "weekly"
          ? "Every week"
          : rule.frequency === "monthly"
            ? "Every month"
            : `Every ${rule.interval} day${rule.interval === 1 ? "" : "s"}`;
  if (rule.end.kind === "date") return `${base}, until ${rule.end.date}`;
  if (rule.end.kind === "count") return `${base}, ${rule.end.count} times`;
  return base;
}
