import { CalendarClient } from "@/app/(app)/kalender/calendar-client";

export const metadata = {
  title: "Google Calendar — Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function KalenderPage() {
  return <CalendarClient />;
}
