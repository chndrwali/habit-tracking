// Helpers zona waktu tanpa dependency tambahan.
// Jadwal disimpan sebagai instant UTC (startAt/endAt), tapi recurrence dan
// tampilan selalu dievaluasi dalam timezone profil pengguna (BR-07).

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/** Offset zona waktu (menit) untuk sebuah instant. */
export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Konversi tanggal lokal + jam lokal ("YYYY-MM-DD", "HH:mm") ke instant UTC. */
export function zonedDateTimeToUtc(
  dateKey: string,
  localTime: string,
  timeZone: string,
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = localTime.split(":").map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  // Iterasi dua kali supaya offset DST ikut terkoreksi.
  for (let i = 0; i < 2; i++) {
    const offset = timeZoneOffsetMinutes(guess, timeZone);
    guess = new Date(Date.UTC(y, m - 1, d, hh, mm) - offset * 60000);
  }
  return guess;
}

/** Pecah sebuah instant menjadi tanggal/waktu lokal dalam timezone tertentu. */
export function utcToZoned(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  const dateKey = `${p.year}-${String(p.month).padStart(2, "0")}-${String(
    p.day,
  ).padStart(2, "0")}`;
  return {
    dateKey,
    hour: p.hour,
    minute: p.minute,
    timeLabel: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(
      2,
      "0",
    )}`,
  };
}

/** Hari dalam minggu (0 = Minggu) untuk sebuah dateKey kalender. */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function formatTimeLabel(
  date: Date,
  timeZone: string,
  timeFormat: string,
): string {
  const { timeLabel, hour, minute } = utcToZoned(date, timeZone);
  if (timeFormat === "12") {
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const suffix = hour < 12 ? "AM" : "PM";
    return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }
  return timeLabel;
}
