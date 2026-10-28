import { createTRPCRouter } from "@/trpc/init";
import { habitsRouter } from "@/trpc/routers/habits";
import { agendaRouter } from "@/trpc/routers/agenda";
import { progressRouter } from "@/trpc/routers/progress";
import { settingsRouter } from "@/trpc/routers/settings";
import { calendarRouter } from "@/trpc/routers/calendar";

export const appRouter = createTRPCRouter({
  habits: habitsRouter,
  agenda: agendaRouter,
  progress: progressRouter,
  settings: settingsRouter,
  calendar: calendarRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
