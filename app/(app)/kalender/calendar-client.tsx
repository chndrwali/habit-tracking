"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { appToast } from "@/components/custom/app-toast";

export function CalendarClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");

  const status = useQuery(trpc.calendar.status.queryOptions());
  const calendars = useQuery({
    ...trpc.calendar.listCalendars.queryOptions(),
    enabled:
      status.data?.state === "pending" || status.data?.state === "connected",
  });
  const syncList = useQuery(trpc.calendar.syncStatusList.queryOptions());

  const invalidate = () => {
    queryClient.invalidateQueries();
  };

  const select = useMutation(
    trpc.calendar.selectCalendar.mutationOptions({
      onSuccess: () => {
        appToast.success("Kalender dipilih");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const disconnect = useMutation(
    trpc.calendar.disconnect.mutationOptions({
      onSuccess: () => {
        appToast.success("Koneksi diputus. Event Google tidak dihapus.");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const retry = useMutation(
    trpc.calendar.retry.mutationOptions({
      onSuccess: () => {
        appToast.success("Sinkronisasi berhasil");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );

  const state = status.data?.state;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Google Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Aplikasi ini sumber utama jadwal; Google Calendar menerima event dari
          item yang kamu kirim. Pengingat mengikuti setelan Google Calendar,
          bukan jaminan notifikasi dari aplikasi ini.
        </p>
      </div>

      {status.isPending && <p className="text-sm text-muted-foreground">Memuat status…</p>}
      {status.data && (
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span>Status:</span>
            <Badge>{state}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{status.data.detail}</p>

          {state === "disconnected" && (
            <Button
              className="mt-4"
              onClick={() =>
                signIn.social({ provider: "google", callbackURL: "/kalender" })
              }
            >
              Hubungkan Google
            </Button>
          )}
          {state === "not_configured" && (
            <p className="mt-3 text-sm">
              Langkah setup ada di SETUP.md: buat OAuth client di Google Cloud,
              isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET, lalu deploy ulang.
            </p>
          )}
          {state === "connected" && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => disconnect.mutate()}
            >
              Putuskan koneksi (event tidak dihapus)
            </Button>
          )}
        </div>
      )}

      {(state === "pending" || state === "connected") && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Pilih kalender tujuan</h2>
          {calendars.isPending && <p className="mt-2 text-sm text-muted-foreground">Memuat daftar kalender…</p>}
          {calendars.isError && (
            <p className="mt-2 text-sm text-destructive">
              Gagal memuat kalender: {calendars.error.message}
            </p>
          )}
          {calendars.data && (
            <div className="mt-3 flex flex-wrap gap-2">
              {calendars.data.map((c) => (
                <Button
                  key={c.id}
                  variant={selected === c.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelected(c.id)}
                >
                  {c.summary}
                  {c.primary ? " (utama)" : ""}
                </Button>
              ))}
            </div>
          )}
          {selected && (
            <Button
              className="mt-3"
              onClick={() => {
                const cal = calendars.data?.find((c) => c.id === selected);
                if (cal) select.mutate({ calendarId: cal.id, calendarName: cal.summary });
              }}
            >
              Simpan kalender ini
            </Button>
          )}
          {status.data?.connection && (
            <p className="mt-3 text-sm text-muted-foreground">
              Saat ini: {status.data.connection.calendarName ?? status.data.connection.calendarId}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Status sinkronisasi terakhir</h2>
        {syncList.data?.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada item yang dikirim ke kalender. Kirim dari halaman Hari Ini.
          </p>
        )}
        <ul className="mt-2 space-y-2">
          {syncList.data?.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {item.dateKey} · {item.title}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={item.syncStatus === "synced" ? "default" : "secondary"}>
                  {item.syncStatus}
                </Badge>
                {item.syncStatus === "failed" && (
                  <Button size="sm" variant="outline" onClick={() => retry.mutate({ id: item.id })}>
                    Coba lagi
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
