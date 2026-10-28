import { z } from "zod";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getOrCreateProfile } from "@/lib/agenda";
import { utcToZoned } from "@/lib/timezone";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const scheduleInput = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7),
  localTime: z.string().regex(timeRegex, "Jam harus format HH:mm"),
  durationMinutes: z.number().int().min(5).max(480),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  effectiveUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const habitInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0EA5A5"),
  defaultDurationMinutes: z.number().int().min(5).max(480).default(30),
  schedules: z.array(scheduleInput).min(1).max(5),
});

async function assertHabitOwner(userId: string, habitId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error("Kebiasaan tidak ditemukan.");
  return habit;
}

export const habitsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    return prisma.habit.findMany({
      where: { userId },
      include: { schedules: true },
      orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    });
  }),

  create: protectedProcedure.input(habitInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.auth.user.id;
    return prisma.habit.create({
      data: {
        userId,
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        color: input.color,
        defaultDurationMinutes: input.defaultDurationMinutes,
        schedules: {
          create: input.schedules.map((s) => ({
            daysOfWeek: s.daysOfWeek,
            localTime: s.localTime,
            durationMinutes: s.durationMinutes,
            effectiveFrom: s.effectiveFrom ?? null,
            effectiveUntil: s.effectiveUntil ?? null,
          })),
        },
      },
    });
  }),

  update: protectedProcedure
    .input(habitInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await assertHabitOwner(userId, input.id);
      const profile = await getOrCreateProfile(userId);
      const todayKey = utcToZoned(new Date(), profile.timezone).dateKey;
      // Perubahan jadwal hanya berlaku untuk occurrence mendatang (BR-04):
      // hapus occurrence pending di masa depan, riwayat tidak disentuh.
      await prisma.scheduledItem.deleteMany({
        where: {
          userId,
          habitId: input.id,
          status: "pending",
          dateKey: { gte: todayKey },
        },
      });
      await prisma.habitSchedule.deleteMany({ where: { habitId: input.id } });
      return prisma.habit.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description || null,
          category: input.category || null,
          color: input.color,
          defaultDurationMinutes: input.defaultDurationMinutes,
          schedules: {
            create: input.schedules.map((s) => ({
              daysOfWeek: s.daysOfWeek,
              localTime: s.localTime,
              durationMinutes: s.durationMinutes,
              effectiveFrom: s.effectiveFrom ?? null,
              effectiveUntil: s.effectiveUntil ?? null,
            })),
          },
        },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await assertHabitOwner(userId, input.id);
      // Arsip menghentikan occurrence mendatang, riwayat tetap (BR-03).
      await prisma.scheduledItem.deleteMany({
        where: { userId, habitId: input.id, status: "pending" },
      });
      return prisma.habit.update({
        where: { id: input.id },
        data: { archivedAt: new Date() },
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await assertHabitOwner(userId, input.id);
      return prisma.habit.update({
        where: { id: input.id },
        data: { archivedAt: null },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await assertHabitOwner(userId, input.id);
      // Hapus permanen: riwayat habit ini ikut terhapus. UI wajib
      // mengonfirmasi ini; arsip adalah pilihan default yang aman.
      await prisma.scheduledItem.deleteMany({ where: { userId, habitId: input.id } });
      await prisma.habit.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
