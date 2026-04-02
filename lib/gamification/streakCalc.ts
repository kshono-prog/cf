export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
};

/**
 * Calculates daily streak from a list of ISO date strings (e.g. approvedAt values).
 * A "streak day" = any day that has at least one entry.
 * Current streak counts from today or yesterday backwards.
 */
export function calcDailyStreak(dates: (string | null)[]): StreakInfo {
  const validDates = dates.filter((d): d is string => typeof d === "string");
  if (validDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  // Deduplicate to YYYY-MM-DD
  const daySet = new Set(validDates.map((d) => d.slice(0, 10)));
  const allDays = Array.from(daySet).sort(); // oldest first

  const lastActiveDate = allDays.at(-1) ?? null;

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < allDays.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(allDays[i - 1] as string);
      const curr = new Date(allDays[i] as string);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / 86_400_000
      );
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  // Current streak: walk backwards from most recent day
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const newestDay = allDays.at(-1) ?? "";
  const isActive = newestDay === today || newestDay === yesterday;

  let currentStreak = 0;
  if (isActive) {
    const reversed = [...allDays].reverse();
    currentStreak = 1;
    for (let i = 1; i < reversed.length; i++) {
      const prev = new Date(reversed[i - 1] as string);
      const curr = new Date(reversed[i] as string);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / 86_400_000
      );
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, lastActiveDate };
}
