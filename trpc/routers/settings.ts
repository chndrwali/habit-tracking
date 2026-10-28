import { z } from "zod";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getOrCreateProfile } from "@/lib/agenda";
import { isValidTimeZone } from "@/lib/timezone";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const profile = await getOrCreateProfile(userId);
    return { ...profile, name: ctx.auth.user.name, email: ctx.auth.user.email };
  }),

  update: protectedProcedure
    .input(
      z.object({
        timezone: z.string().refine(isValidTimeZone, "Zona waktu tidak valid"),
        weekStartsOn: z.union([z.literal(0), z.literal(1)]),
        timeFormat: z.union([z.literal("24"), z.literal("12")]),
        reminderMinutes: z.union([
          z.literal(0),
          z.literal(5),
          z.literal(10),
          z.literal(15),
          z.literal(30),
          z.literal(60),
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      await getOrCreateProfile(userId);
      return prisma.userProfile.update({
        where: { userId },
        data: input,
      });
    }),
});
