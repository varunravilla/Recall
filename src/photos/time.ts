// Resolve AI-proposed local wall times with IANA rules on the server, rather
// than relying on a model to calculate daylight-saving offsets correctly.
export function localTimeToIso(local: string, timezone: string): string | null {
  const match = local.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?$/);
  if (!match) return null;
  const numbers = match.slice(1).map(n => Number(n ?? 0));
  const [year, month, day, hour, minute, second] = numbers as [number,number,number,number,number,number];
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return null; }
  function parts(timestamp: number): number[] {
    const values = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
    return ["year", "month", "day", "hour", "minute", "second"].map(key => Number(values[key]));
  }
  const offsets = new Set<number>();
  for (const sample of [wall - 86400000, wall, wall + 86400000]) {
    const [y,m,d,h,min,s] = parts(sample) as [number,number,number,number,number,number];
    offsets.add(Date.UTC(y,m-1,d,h,min,s) - sample);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(candidate => parts(candidate).every((part, i) => part === numbers[i]));
  // Ambiguous fall-back times and nonexistent spring-forward times require review.
  return matches.length === 1 ? new Date(matches[0]!).toISOString() : null;
}
