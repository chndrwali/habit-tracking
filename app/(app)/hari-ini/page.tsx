import { AgendaClient } from "@/app/(app)/hari-ini/agenda-client";

export const metadata = {
  title: "Hari Ini — Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function HariIniPage() {
  return <AgendaClient />;
}
