/**
 * Day keys are always computed in the server's local timezone, which for a
 * self-hosted single-user app is the user's own timezone. Entries store the key
 * alongside the full ISO timestamp so history never drifts.
 */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDayKey(new Date());
}

export function shiftDayKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return toDayKey(new Date(y, m - 1, d + delta));
}

export function formatDayLabel(dayKey: string, locale = "fr-FR"): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(iso: string, locale = "fr-FR"): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
