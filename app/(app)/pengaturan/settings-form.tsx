"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appToast } from "@/components/custom/app-toast";

const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "UTC",
];

type Initial = {
  timezone: string;
  weekStartsOn: number;
  timeFormat: string;
  reminderMinutes: number;
  email: string | null;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    timezone: initial.timezone,
    weekStartsOn: initial.weekStartsOn as 0 | 1,
    timeFormat: initial.timeFormat as "24" | "12",
    reminderMinutes: initial.reminderMinutes as 0 | 5 | 10 | 15 | 30 | 60,
  });

  const save = useMutation(
    trpc.settings.update.mutationOptions({
      onSuccess: () => {
        appToast.success("Pengaturan disimpan");
        queryClient.invalidateQueries();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(form);
      }}
    >
      <label className="block text-sm">
        Zona waktu
        <select
          className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Awal pekan
        <select
          className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
          value={form.weekStartsOn}
          onChange={(e) =>
            setForm({ ...form, weekStartsOn: Number(e.target.value) as 0 | 1 })
          }
        >
          <option value={1}>Senin</option>
          <option value={0}>Minggu</option>
        </select>
      </label>
      <label className="block text-sm">
        Format waktu
        <select
          className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
          value={form.timeFormat}
          onChange={(e) =>
            setForm({ ...form, timeFormat: e.target.value as "24" | "12" })
          }
        >
          <option value="24">24 jam</option>
          <option value="12">12 jam (AM/PM)</option>
        </select>
      </label>
      <label className="block text-sm">
        Pengingat default Google Calendar (menit sebelum acara)
        <Input
          type="number"
          value={form.reminderMinutes}
          onChange={(e) =>
            setForm({
              ...form,
              reminderMinutes: Number(e.target.value) as 0 | 5 | 10 | 15 | 30 | 60,
            })
          }
          min={0}
          max={60}
        />
      </label>
      <p className="text-xs text-muted-foreground">Akun: {initial.email ?? "-"}</p>
      <Button type="submit" disabled={save.isPending}>
        Simpan pengaturan
      </Button>
    </form>
  );
}
