"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function startOfWeek(date: Date, weekStartsOn: number): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStartsOn === 0 ? -day : day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function ProgressClient() {
  const trpc = useTRPC();
  const settings = useQuery(trpc.settings.get.queryOptions());
  const weekStartsOn = settings.data?.weekStartsOn ?? 1;
  // Offset minggu dari minggu berjalan: minggu yang tampil selalu diturunkan
  // dari pengaturan awal pekan, tanpa effect sinkronisasi state.
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(startOfWeek(new Date(), weekStartsOn), weekOffset * 7);

  const weekly = useQuery(trpc.progress.weekly.queryOptions({ weekStart }));
  const summary = useQuery(trpc.progress.habitSummary.queryOptions());
  const history = useQuery(trpc.progress.history.queryOptions());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progres &amp; riwayat</h1>
        <p className="text-sm text-muted-foreground">
          Progres = selesai dibagi total hari ini, tidak menghitung yang
          dilewati. Streak menghitung hari terjadwal berturut-turut yang
          selesai; hari yang dilewati bersifat netral.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ringkasan mingguan</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              ← Minggu lalu
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              Minggu depan →
            </Button>
          </div>
        </div>
        {weekly.isPending && <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>}
        {weekly.data && (
          <ol className="mt-3 space-y-2">
            {weekly.data.days.map((d) => (
              <li key={d.date} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm">
                  {DAY_NAMES[new Date(`${d.date}T00:00:00Z`).getUTCDay()]} · {d.date}
                </span>
                <span className="text-sm text-muted-foreground">
                  {d.summary.rate === null
                    ? "Tidak ada jadwal"
                    : `${d.summary.completed}/${d.summary.total} selesai · ${d.summary.rate}%`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Per kebiasaan</h2>
        {summary.isPending && <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>}
        <ul className="mt-3 space-y-2">
          {summary.data?.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: h.color }} />
                {h.name}
                {h.archived && <Badge variant="secondary">Diarsipkan</Badge>}
              </span>
              <span className="text-sm text-muted-foreground">
                {h.rate === null ? "Belum ada data" : `${h.completed}/${h.total} · ${h.rate}%`}
                {" · "}🔥 {h.streak} hari
              </span>
            </li>
          ))}
        </ul>
        {summary.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada kebiasaan.</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Riwayat 30 hari terakhir</h2>
        <ul className="mt-3 space-y-1">
          {history.data?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span>
                {item.dateKey} · {item.title}
              </span>
              <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                {item.status}
              </Badge>
            </li>
          ))}
        </ul>
        {history.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada riwayat.</p>
        )}
      </section>
    </div>
  );
}
