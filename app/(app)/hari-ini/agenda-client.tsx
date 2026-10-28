"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { appToast } from "@/components/custom/app-toast";

const STATUS_LABEL: Record<string, string> = {
  pending: "Belum selesai",
  completed: "Selesai",
  skipped: "Dilewati",
  missed: "Terlewat",
};

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function AgendaClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const [showOneTime, setShowOneTime] = useState(false);
  const [oneTime, setOneTime] = useState({
    title: "",
    localTime: "09:00",
    durationMinutes: 30,
  });

  const agenda = useQuery(trpc.agenda.day.queryOptions({ date }));
  const invalidate = () =>
    queryClient.invalidateQueries();

  const setStatus = useMutation(
    trpc.agenda.setStatus.mutationOptions({
      onSuccess: () => {
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const syncItem = useMutation(
    trpc.calendar.syncItem.mutationOptions({
      onSuccess: () => {
        appToast.success("Terkirim ke Google Calendar");
        invalidate();
      },
      onError: (e) => {
        appToast.error(e.message);
        invalidate();
      },
    }),
  );
  const createOneTime = useMutation(
    trpc.agenda.createOneTime.mutationOptions({
      onSuccess: () => {
        appToast.success("Tugas ditambahkan");
        setOneTime({ title: "", localTime: "09:00", durationMinutes: 30 });
        setShowOneTime(false);
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );

  const data = agenda.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda hari ini</h1>
          <p className="text-sm text-muted-foreground">
            Rencanakan hari berdasarkan waktu, bukan sekadar checklist.
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {agenda.isPending && <p className="text-sm text-muted-foreground">Memuat agenda…</p>}
      {agenda.isError && (
        <p className="text-sm text-destructive">
          Gagal memuat agenda: {agenda.error.message}. Periksa koneksi database
          di SETUP.md, lalu muat ulang.
        </p>
      )}

      {data && (
        <>
          <div>
            <div className="flex justify-between text-sm">
              <span>
                {data.summary.completed} dari {data.summary.total} selesai
                {data.summary.skipped > 0 && ` · ${data.summary.skipped} dilewati`}
                {data.summary.missed > 0 && ` · ${data.summary.missed} terlewat`}
              </span>
              <span className="font-medium">{data.summary.rate}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.summary.rate}%` }}
              />
            </div>
            {data.nextItem && (
              <p className="mt-3 text-sm">
                Berikutnya: <strong>{data.nextItem.title}</strong> pukul{" "}
                {data.nextItem.startLabel}
              </p>
            )}
          </div>

          {data.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Belum ada jadwal untuk hari ini</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Buat kebiasaan pertamamu, atau tambahkan satu tugas satu kali di
                bawah.
              </p>
              <Button asChild className="mt-4">
                <Link href="/kebiasaan">Buat kebiasaan</Link>
              </Button>
            </div>
          ) : (
            <ol className="space-y-3">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-lg border p-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: item.habitColor ?? "#64748B",
                    opacity: item.status === "completed" ? 0.75 : 1,
                  }}
                >
                  <div className="w-14 shrink-0 text-sm font-medium tabular-nums">
                    {item.startLabel}
                    <div className="text-xs font-normal text-muted-foreground">
                      {item.endLabel}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          item.status === "completed" ? "line-through" : ""
                        }
                      >
                        {item.title}
                      </span>
                      <Badge variant="secondary">
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                      {item.habitCategory && (
                        <Badge variant="outline">{item.habitCategory}</Badge>
                      )}
                      {item.source === "one_time" && (
                        <Badge variant="outline">Satu kali</Badge>
                      )}
                    </div>
                    {item.conflictWith.length > 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        Bentrok dengan: {item.conflictWith.join(", ")} — jadwal
                        tidak dipindahkan otomatis, silakan atur sendiri.
                      </p>
                    )}
                    {item.syncStatus === "failed" && item.syncError && (
                      <p className="mt-1 text-xs text-destructive">
                        Sinkronisasi gagal: {item.syncError}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              setStatus.mutate({ id: item.id, status: "completed" })
                            }
                          >
                            Selesai
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setStatus.mutate({ id: item.id, status: "skipped" })
                            }
                          >
                            Lewati
                          </Button>
                        </>
                      )}
                      {(item.status === "completed" ||
                        item.status === "skipped") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setStatus.mutate({ id: item.id, status: "pending" })
                          }
                        >
                          Kembalikan
                        </Button>
                      )}
                      {item.syncStatus !== "synced" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncItem.mutate({ id: item.id })}
                        >
                          {item.syncStatus === "failed"
                            ? "Coba kirim ulang"
                            : "Kirim ke Kalender"}
                        </Button>
                      )}
                      {item.syncStatus === "synced" && (
                        <span className="self-center text-xs text-muted-foreground">
                          Tersinkron ke Google Calendar
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="rounded-lg border p-4">
        <Button variant="outline" onClick={() => setShowOneTime((v) => !v)}>
          {showOneTime ? "Tutup" : "+ Tugas satu kali"}
        </Button>
        {showOneTime && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createOneTime.mutate({ ...oneTime, date });
            }}
          >
            <Input
              placeholder="Judul tugas, mis. Bayar tagihan"
              value={oneTime.title}
              onChange={(e) => setOneTime({ ...oneTime, title: e.target.value })}
              required
            />
            <div className="flex gap-3">
              <Input
                type="time"
                value={oneTime.localTime}
                onChange={(e) =>
                  setOneTime({ ...oneTime, localTime: e.target.value })
                }
                required
              />
              <Input
                type="number"
                min={5}
                max={480}
                value={oneTime.durationMinutes}
                onChange={(e) =>
                  setOneTime({
                    ...oneTime,
                    durationMinutes: Number(e.target.value),
                  })
                }
                aria-label="Durasi (menit)"
              />
            </div>
            <Button type="submit" disabled={createOneTime.isPending}>
              Tambah ke agenda
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
