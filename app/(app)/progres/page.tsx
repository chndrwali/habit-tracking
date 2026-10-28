import { ProgressClient } from "@/app/(app)/progres/progress-client";

export const metadata = {
  title: "Progres — Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function ProgresPage() {
  return <ProgressClient />;
}
