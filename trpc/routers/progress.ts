import { z } from "zod";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { addDays, getOrCreateProfile, materializeDay } from "@/lib/agenda";
import { utcToZoned } from "@/lib/timezone";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function daySummary(
  rows: Array<{ status: string }>,
) {
  const total = rows.filter((r) => r.status !== "skipped").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  return {
    total,
    completed,
    skipped: rows.filter((r) => r.status === "skipped").length,
    missed: rows.filter((r) => r.status === "missed").length,
    rate: total === 0 ? null : Math.round((completed / total) * 100),
  };
}

export const progressRouter = createTRPCRouter({
  /** Ringkasan 7 hari mulai weekStart (FR-024). */
  weekly: protectedProcedure
    .input(z.object({ weekStart: dateKeySchema }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const profile = await getOrCreateProfile(userId);
      const days: Array<{ date: string; summary: ReturnType<typeof daySummary> }> = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(input.weekStart, i);
        await materializeDay(userId, profile, date);
        const rows = await prisma.scheduledItem.findMany({
          where: { userId, dateKey: date },
          select: { status: true },
        });
        days.push({ date, summary: daySummary(rows) });
      }
      return { days, timezone: profile.timezone };
    }),

  /** Riwayat per habit: total, selesai, rate, dan streak (FR-025). */
  habitSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const profile = await getOrCreateProfile(userId);
    const todayKey = utcToZoned(new Date(), profile.timezone).dateKey;

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: { schedules: true },
      orderBy: { name: "asc" },
    });

    const result = [];
    for (const habit of habits) {
      const items = await prisma.scheduledItem.findMany({
        where: { userId, habitId: habit.id },
        select: { status: true, dateKey: true },
      });
      const summary = daySummary(items);

      // Streak: hari terjadwal berturut-turut yang selesai, dihitung mundur
      // dari hari ini. Hari yang di-skip bersifat netral (tidak memutus,
      // tidak menambah). Hari terjadwal yang missed/pending di masa lalu
      // memutus streak. Batas 365 hari supaya tidak berputar tanpa henti.
      let streak = 0;
      let cursor = todayKey;
      const byDate = new Map<string, string[]>();
      for (const it of items) {
        const arr = byDate.get(it.dateKey) ?? [];
        arr.push(it.status);
        byDate.set(it.dateKey, arr);
      }
      for (let i = 0; i < 365; i++) {
        const weekday = new Date(`${cursor}T00:00:00Z`).getUTCDay();
        const scheduledToday =
          habit.archivedAt === null &&
          habit.schedules.some((s) => {
            const days = s.daysOfWeek.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : s.daysOfWeek;
            const inRange =
              (!s.effectiveFrom || s.effectiveFrom <= cursor) &&
              (!s.effectiveUntil || s.effectiveUntil >= cursor);
            return inRange && days.includes(weekday);
          });
        if (!scheduledToday) {
          cursor = addDays(cursor, -1);
          continue;
        }
        const statuses = byDate.get(cursor) ?? [];
        if (statuses.length === 0) {
          // Hari terjadwal di masa lalu tanpa occurrence = belum dikerjakan.
          if (cursor < todayKey) break;
          cursor = addDays(cursor, -1);
          continue;
        }
        if (statuses.every((s) => s === "skipped")) {
          cursor = addDays(cursor, -1);
          continue;
        }
        if (statuses.some((s) => s === "completed")) {
          streak += 1;
          cursor = addDays(cursor, -1);
          continue;
        }
        break;
      }

      result.push({
        id: habit.id,
        name: habit.name,
        color: habit.color,
        category: habit.category,
        archived: habit.archivedAt !== null,
        total: summary.total,
        completed: summary.completed,
        rate: summary.rate,
        streak,
      });
    }
    return result;
  }),

  /** Riwayat 30 hari terakhir (FR-010: riwayat tidak berubah saat definisi diubah). */
  history: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const profile = await getOrCreateProfile(userId);
    const todayKey = utcToZoned(new Date(), profile.timezone).dateKey;
    const fromKey = addDays(todayKey, -29);
    return prisma.scheduledItem.findMany({
      where: {
        userId,
        dateKey: { gte: fromKey, lte: todayKey },
        status: { in: ["completed", "skipped", "missed"] },
      },
      include: { habit: { select: { name: true, color: true } } },
      orderBy: [{ dateKey: "desc" }, { startAt: "desc" }],
      take: 200,
    });
  }),
});
