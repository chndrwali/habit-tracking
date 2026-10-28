import { z } from "zod";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getOrCreateProfile } from "@/lib/agenda";
import {
  createGoogleEvent,
  listGoogleCalendars,
  updateGoogleEvent,
} from "@/lib/google-calendar";

export const GOOGLE_CONFIGURED = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

async function syncOneItem(userId: string, itemId: string) {
  const profile = await getOrCreateProfile(userId);
  const item = await prisma.scheduledItem.findFirst({
    where: { id: itemId, userId },
    include: { habit: true, mappings: true },
  });
  if (!item) throw new Error("Item tidak ditemukan.");
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!connection) {
    throw new Error("Belum ada kalender yang dipilih. Pilih kalender dulu.");
  }
  const existing = item.mappings[0];
  const input = {
    summary: item.habit ? `${item.title}` : item.title,
    description: item.notes ?? "",
    startAt: item.startAt,
    endAt: item.endAt,
    timeZone: item.timezone,
    reminderMinutes: profile.reminderMinutes,
  };
  try {
    if (existing) {
      await updateGoogleEvent(
        userId,
        connection.calendarId,
        existing.externalEventId,
        input,
      );
      await prisma.calendarEventMapping.update({
        where: { id: existing.id },
        data: { syncStatus: "synced", lastSyncedAt: new Date(), error: null },
      });
    } else {
      const externalEventId = await createGoogleEvent(
        userId,
        connection.calendarId,
        input,
      );
      await prisma.calendarEventMapping.create({
        data: {
          connectionId: connection.id,
          scheduledItemId: item.id,
          externalEventId,
          externalCalendarId: connection.calendarId,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        },
      });
    }
    await prisma.scheduledItem.update({
      where: { id: item.id },
      data: { syncStatus: "synced", syncError: null },
    });
    return { ok: true };
  } catch (err) {
    // Kegagalan sync tidak membatalkan jadwal lokal (BR-10).
    const message = err instanceof Error ? err.message : "Sinkronisasi gagal.";
    await prisma.scheduledItem.update({
      where: { id: item.id },
      data: { syncStatus: "failed", syncError: message },
    });
    if (existing) {
      await prisma.calendarEventMapping.update({
        where: { id: existing.id },
        data: { syncStatus: "failed", error: message },
      });
    }
    throw new Error(message);
  }
}

export const calendarRouter = createTRPCRouter({
  /** Status integrasi untuk UI (FR-019). */
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const connection = await prisma.calendarConnection.findUnique({
      where: { userId_provider: { userId, provider: "google" } },
    });
    const googleAccount = await prisma.account.findFirst({
      where: { userId, providerId: "google" },
      select: { id: true },
    });
    if (!GOOGLE_CONFIGURED) {
      return {
        state: "not_configured" as const,
        connection: null,
        detail:
          "Google OAuth belum dikonfigurasi di server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET kosong). Lihat SETUP.md.",
      };
    }
    if (!googleAccount) {
      return {
        state: "disconnected" as const,
        connection: null,
        detail: "Akun Google belum terhubung.",
      };
    }
    if (!connection) {
      return {
        state: "pending" as const,
        connection: null,
        detail: "Akun Google terhubung, tapi kalender tujuan belum dipilih.",
      };
    }
    return {
      state: "connected" as const,
      connection,
      detail: `Tersinkron ke ${connection.calendarName ?? connection.calendarId}.`,
    };
  }),

  listCalendars: protectedProcedure.query(async ({ ctx }) => {
    return listGoogleCalendars(ctx.auth.user.id);
  }),

  selectCalendar: protectedProcedure
    .input(z.object({ calendarId: z.string(), calendarName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      return prisma.calendarConnection.upsert({
        where: { userId_provider: { userId, provider: "google" } },
        update: {
          calendarId: input.calendarId,
          calendarName: input.calendarName,
          status: "connected",
        },
        create: {
          userId,
          provider: "google",
          calendarId: input.calendarId,
          calendarName: input.calendarName,
          status: "connected",
        },
      });
    }),

  /** Putuskan koneksi. Event Google TIDAK dihapus (BR-11). */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    await prisma.calendarConnection.deleteMany({
      where: { userId, provider: "google" },
    });
    return { ok: true };
  }),

  syncItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => syncOneItem(ctx.auth.user.id, input.id)),

  /** Retry sinkronisasi item yang gagal (FR-020, idempotent via mapping). */
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => syncOneItem(ctx.auth.user.id, input.id)),

  syncStatusList: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    return prisma.scheduledItem.findMany({
      where: { userId, syncStatus: { in: ["synced", "failed", "pending"] } },
      include: { mappings: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  }),
});
