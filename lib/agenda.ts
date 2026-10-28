import prisma from "@/lib/prisma";
import {
  addDaysToDateKey,
  utcToZoned,
  weekdayOfDateKey,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

export type Profile = {
  timezone: string;
  weekStartsOn: number;
  timeFormat: string;
  reminderMinutes: number;
};

export const DEFAULT_PROFILE: Profile = {
  timezone: "Asia/Jakarta",
  weekStartsOn: 1,
  timeFormat: "24",
  reminderMinutes: 15,
};

/** Grace period sebelum item pending dianggap missed (keputusan MVP, PRD terbuka). */
export const MISSED_GRACE_MINUTES = 30;

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const row = await prisma.userProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, ...DEFAULT_PROFILE },
  });
  return {
    timezone: row.timezone,
    weekStartsOn: row.weekStartsOn,
    timeFormat: row.timeFormat,
    reminderMinutes: row.reminderMinutes,
  };
}

/**
 * Materialisasi occurrence untuk satu hari: untuk setiap jadwal habit aktif
 * yang harinya cocok, buat ScheduledItem bila belum ada (idempotent lewat
 * unique [userId, scheduleId, dateKey]). Item pending yang sudah lewat
 * batas + grace period ditandai missed. Perubahan definisi habit tidak
 * menyentuh item yang sudah completed/skipped/missed (BR-04, BR-10).
 */
export async function materializeDay(
  userId: string,
  profile: Profile,
  dateKey: string,
) {
  const weekday = weekdayOfDateKey(dateKey);
  const schedules = await prisma.habitSchedule.findMany({
    where: {
      habit: { userId, archivedAt: null },
      OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dateKey } }],
      AND: [
        { OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: dateKey } }] },
      ],
    },
    include: { habit: true },
  });

  for (const s of schedules) {
    const days = s.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : s.daysOfWeek;
    if (!days.includes(weekday)) continue;
    const startAt = zonedDateTimeToUtc(dateKey, s.localTime, profile.timezone);
    const endAt = new Date(startAt.getTime() + s.durationMinutes * 60000);
    await prisma.scheduledItem.upsert({
      where: {
        userId_scheduleId_dateKey: {
          userId,
          scheduleId: s.id,
          dateKey,
        },
      },
      update: {},
      create: {
        userId,
        habitId: s.habitId,
        scheduleId: s.id,
        title: s.habit.name,
        dateKey,
        startAt,
        endAt,
        timezone: profile.timezone,
        status: "pending",
        source: "habit",
      },
    });
  }

  // Tandai missed: hanya untuk hari yang sudah lewat / hari ini, dan hanya
  // item yang masih pending (BR-05).
  const now = new Date();
  const todayKey = utcToZoned(now, profile.timezone).dateKey;
  if (dateKey <= todayKey) {
    const cutoff = new Date(now.getTime() - MISSED_GRACE_MINUTES * 60000);
    await prisma.scheduledItem.updateMany({
      where: {
        userId,
        dateKey,
        status: "pending",
        endAt: { lt: cutoff },
      },
      data: { status: "missed" },
    });
  }
}

export function addDays(dateKey: string, days: number) {
  return addDaysToDateKey(dateKey, days);
}
