"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { SettingsForm } from "@/app/(app)/pengaturan/settings-form";

export function SettingsClient() {
  const trpc = useTRPC();
  const settings = useQuery(trpc.settings.get.queryOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Zona waktu profil menjadi basis tampilan jadwal. Mengubah zona waktu
          tidak mengubah riwayat yang sudah tercatat.
        </p>
      </div>

      {settings.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {settings.isError && (
        <p className="text-sm text-destructive">Gagal memuat: {settings.error.message}</p>
      )}
      {settings.data && (
        <SettingsForm
          key={`${settings.data.timezone}-${settings.data.weekStartsOn}-${settings.data.timeFormat}-${settings.data.reminderMinutes}`}
          initial={{
            timezone: settings.data.timezone,
            weekStartsOn: settings.data.weekStartsOn,
            timeFormat: settings.data.timeFormat,
            reminderMinutes: settings.data.reminderMinutes,
            email: settings.data.email,
          }}
        />
      )}
    </div>
  );
}
