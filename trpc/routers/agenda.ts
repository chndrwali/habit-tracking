import { z } from "zod";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getOrCreateProfile, materializeDay } from "@/lib/agenda";
import { formatTimeLabel, zonedDateTimeToUtc } from "@/lib/timezone";
import { deleteGoogleEvent } from "@/lib/google-calendar";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type AgendaItem = {
  id: string;
  title: string;
  notes: string | null;
  dateKey: string;
  startAt: Date;
  endAt: Date;
  startLabel: string;
  endLabel: string;
  status: string;
  source: string;
  syncStatus: string;
  syncError: string | null;
  habitId: string | null;
  habitName: string | null;
  habitColor: string | null;
  habitCategory: string | null;
  conflictWith: string[];
};

function summarize(items: AgendaItem[]) {
  const total = items.filter((i) => i.status !== "skipped").length;
  const completed = items.filter((i) => i.status === "completed").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const missed = items.filter((i) => i.status === "missed").length;
  const pending = items.filter((i) => i.status === "pending").length;
  return {
    total,
    completed,
    skipped,
    missed,
    pending,
    rate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export const agendaRouter = createTRPCRouter({
  /** Agenda satu hari: materialisasi occurrence + deteksi bentrok (FR-007/008). */
  day: protectedProcedure
    .input(z.object({ date: dateKeySchema }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const profile = await getOrCreateProfile(userId);
      await materializeDay(userId, profile, input.date);

      const rows = await prisma.scheduledItem.findMany({
        where: { userId, dateKey: input.date },
        include: { habit: true },
        orderBy: { startAt: "asc" },
      });

      const items: AgendaItem[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        dateKey: r.dateKey,
        startAt: r.startAt,
        endAt: r.endAt,
        startLabel: formatTimeLabel(r.startAt, profile.timezone, profile.timeFormat),
        endLabel: formatTimeLabel(r.endAt, profile.timezone, profile.timeFormat),
        status: r.status,
        source: r.source,
        syncStatus: r.syncStatus,
        syncError: r.syncError,
        habitId: r.habitId,
        habitName: r.habit?.name ?? null,
        habitColor: r.habit?.color ?? null,
        habitCategory: r.habit?.category ?? null,
        conflictWith: [],
      }));

      // Deteksi bentrok: overlap waktu, tanpa memindahkan apa pun (FR-008).
      const conflictMap = new Map<string, string[]>();
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (
            items[i].startAt < items[j].endAt &&
            items[j].startAt < items[i].endAt
          ) {
            conflictMap.set(items[i].id, [
              ...(conflictMap.get(items[i].id) ?? []),
              items[j].title,
            ]);
            conflictMap.set(items[j].id, [
              ...(conflictMap.get(items[j].id) ?? []),
              items[i].title,
            ]);
          }
        }
      }
      for (const item of items) item.conflictWith = conflictMap.get(item.id) ?? [];

      const next = items.find((i) => i.status === "pending");
      return {
        date: input.date,
        timezone: profile.timezone,
        items,
        summary: summarize(items),
        nextItem: next ?? null,
      };
    }),

  /** Tugas satu kali (FR-006), bukan kebiasaan berulang. */
  createOneTime: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(100),
        notes: z.string().trim().max(500).optional(),
        date: dateKeySchema,
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        durationMinutes: z.number().int().min(5).max(480),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const profile = await getOrCreateProfile(userId);
      const startAt = zonedDateTimeToUtc(input.date, input.localTime, profile.timezone);
      const endAt = new Date(startAt.getTime() + input.durationMinutes * 60000);
      return prisma.scheduledItem.create({
        data: {
          userId,
          title: input.title,
          notes: input.notes || null,
          dateKey: input.date,
          startAt,
          endAt,
          timezone: profile.timezone,
          status: "pending",
          source: "one_time",
        },
      });
    }),

  /** Ubah status occurrence; idempotent untuk status yang sama (FR-009). */
  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["completed", "skipped", "pending"]),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const item = await prisma.scheduledItem.findFirst({
        where: { id: input.id, userId },
      });
      if (!item) throw new Error("Item tidak ditemukan.");
      return prisma.scheduledItem.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completedAt: input.status === "completed" ? new Date() : null,
          notes: input.note ?? item.notes,
        },
      });
    }),

  /** Geser/ubah jadwal satu occurrence (tidak mengubah definisi habit). */
  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: dateKeySchema,
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        durationMinutes: z.number().int().min(5).max(480),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const item = await prisma.scheduledItem.findFirst({
        where: { id: input.id, userId },
        include: { mappings: true },
      });
      if (!item) throw new Error("Item tidak ditemukan.");
      const profile = await getOrCreateProfile(userId);
      const startAt = zonedDateTimeToUtc(input.date, input.localTime, profile.timezone);
      const endAt = new Date(startAt.getTime() + input.durationMinutes * 60000);
      // Perubahan jadwal: hapus event Google lama dulu (bila ada), lalu
      // hapus mapping agar sinkronisasi berikutnya membuat event baru.
      for (const m of item.mappings) {
        try {
          await deleteGoogleEvent(userId, m.externalCalendarId, m.externalEventId);
        } catch {
          // Gagal hapus event eksternal tidak boleh membatalkan perubahan
          // jadwal lokal (BR-10); status sync akan menandainya.
        }
      }
      if (item.mappings.length > 0) {
        await prisma.calendarEventMapping.deleteMany({
          where: { scheduledItemId: input.id },
        });
      }
      return prisma.scheduledItem.update({
        where: { id: input.id },
        data: {
          dateKey: input.date,
          startAt,
          endAt,
          timezone: profile.timezone,
          syncStatus: "not_synced",
          syncError: null,
        },
      });
    }),

  /** Hapus occurrence satu kali / tugas satu kali (bukan definisi habit). */
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const item = await prisma.scheduledItem.findFirst({
        where: { id: input.id, userId },
      });
      if (!item) throw new Error("Item tidak ditemukan.");
      await prisma.scheduledItem.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
