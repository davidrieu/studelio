/** Jour calendaire en Europe/Paris (YYYY-MM-DD). */
export function parisDateKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

function parseYmd(key: string): { y: number; m: number; day: number } {
  const [y, m, day] = key.split("-").map(Number);
  return { y, m, day };
}

/** Écart en jours calendaires Paris entre deux instants (≥ 0 si `to` est le même jour ou après `from`). */
export function calendarDaysBetweenParis(from: Date, to: Date): number {
  const kf = parisDateKey(from);
  const kt = parisDateKey(to);
  if (kf === kt) return 0;
  const a = parseYmd(kf);
  const b = parseYmd(kt);
  const t0 = Date.UTC(a.y, a.m - 1, a.day);
  const t1 = Date.UTC(b.y, b.m - 1, b.day);
  return Math.round((t1 - t0) / 86400000);
}

/**
 * Règle : au moins une activité par jour calendaire (Paris) pour faire vivre la série.
 * - Premier jour d’activité → 1
 * - Même jour → conserve (minimum 1 si déjà une session enregistrée)
 * - Jour suivant → +1
 * - Saut d’au moins 2 jours → repart à 1
 */
export function computeNextStreak(lastSessionAt: Date | null, streakDays: number, now: Date): number {
  if (!lastSessionAt) {
    return 1;
  }
  const gap = calendarDaysBetweenParis(lastSessionAt, now);
  if (gap <= 0) {
    return Math.max(streakDays, 1);
  }
  if (gap === 1) {
    return streakDays + 1;
  }
  return 1;
}
