import { SettingsClient } from "@/app/(app)/pengaturan/settings-client";

export const metadata = {
  title: "Pengaturan — Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function PengaturanPage() {
  return <SettingsClient />;
}
