import { HabitsClient } from "@/app/(app)/kebiasaan/habits-client";

export const metadata = {
  title: "Kelola Kebiasaan — Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function KebiasaanPage() {
  return <HabitsClient />;
}
