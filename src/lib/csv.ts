/** Minimal RFC 4180-ish CSV: quote a field only when it needs it. */
function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly Record<string, unknown>[], columns: readonly string[]): string {
  const header = columns.map(escapeCell).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCell(row[column])).join(","));
  return [header, ...lines].join("\r\n");
}
