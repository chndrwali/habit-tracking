"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { appToast } from "@/components/custom/app-toast";

const COLORS = [
  "#0EA5A5",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#16A34A",
  "#CA8A04",
  "#64748B",
];

// Urutan tampil Senin–Minggu, nilai = hari JS (0 = Minggu).
const DAYS = [
  { label: "Sen", value: 1 },
  { label: "Sel", value: 2 },
  { label: "Rab", value: 3 },
  { label: "Kam", value: 4 },
  { label: "Jum", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Min", value: 0 },
];

type FormState = {
  name: string;
  category: string;
  color: string;
  localTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  color: COLORS[0],
  localTime: "07:00",
  durationMinutes: 30,
  daysOfWeek: [1, 2, 3, 4, 5],
};

export function HabitsClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const habits = useQuery(trpc.habits.list.queryOptions());
  const invalidate = () =>
    queryClient.invalidateQueries();

  const create = useMutation(
    trpc.habits.create.mutationOptions({
      onSuccess: () => {
        appToast.success("Kebiasaan dibuat");
        setForm(EMPTY_FORM);
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const update = useMutation(
    trpc.habits.update.mutationOptions({
      onSuccess: () => {
        appToast.success("Kebiasaan diperbarui. Perubahan hanya berlaku untuk hari mendatang.");
        setForm(EMPTY_FORM);
        setEditingId(null);
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const archive = useMutation(
    trpc.habits.archive.mutationOptions({
      onSuccess: () => {
        appToast.success("Kebiasaan diarsipkan, riwayat tetap tersimpan");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const unarchive = useMutation(
    trpc.habits.unarchive.mutationOptions({
      onSuccess: () => {
        appToast.success("Kebiasaan diaktifkan lagi");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );
  const remove = useMutation(
    trpc.habits.delete.mutationOptions({
      onSuccess: () => {
        appToast.success("Kebiasaan dihapus permanen");
        invalidate();
      },
      onError: (e) => appToast.error(e.message),
    }),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category || undefined,
      color: form.color,
      defaultDurationMinutes: form.durationMinutes,
      schedules: [
        {
          daysOfWeek: form.daysOfWeek,
          localTime: form.localTime,
          durationMinutes: form.durationMinutes,
          effectiveFrom: null,
          effectiveUntil: null,
        },
      ],
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  };

  const toggleDay = (value: number) =>
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(value)
        ? f.daysOfWeek.filter((d) => d !== value)
        : [...f.daysOfWeek, value],
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola kebiasaan</h1>
        <p className="text-sm text-muted-foreground">
          Satu kebiasaan = satu jadwal. Kosongkan hari berarti setiap hari.
          Mengubah jadwal tidak mengubah riwayat yang sudah tercatat.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border p-4">
        <h2 className="font-semibold">
          {editingId ? "Ubah kebiasaan" : "Kebiasaan baru"}
        </h2>
        <Input
          placeholder="Nama kebiasaan, mis. Baca buku"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          placeholder="Kategori (opsional), mis. Belajar"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Warna:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Warna ${c}`}
              onClick={() => setForm({ ...form, color: c })}
              className="h-7 w-7 rounded-full border-2"
              style={{
                backgroundColor: c,
                borderColor: form.color === c ? "#000" : "transparent",
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            Jam
            <Input
              type="time"
              value={form.localTime}
              onChange={(e) => setForm({ ...form, localTime: e.target.value })}
              className="w-auto"
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Durasi (menit)
            <Input
              type="number"
              min={5}
              max={480}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: Number(e.target.value) })
              }
              className="w-24"
            />
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Hari berulang (kosong = setiap hari)
          </p>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={form.daysOfWeek.includes(d.value)}
                  onCheckedChange={() => toggleDay(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {editingId ? "Simpan perubahan" : "Tambah kebiasaan"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Batal
            </Button>
          )}
        </div>
      </form>

      {habits.isPending && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {habits.isError && (
        <p className="text-sm text-destructive">
          Gagal memuat: {habits.error.message}
        </p>
      )}
      <ul className="space-y-3">
        {habits.data?.map((h) => {
          const s = h.schedules[0];
          return (
            <li key={h.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: h.color }}
                />
                <strong>{h.name}</strong>
                {h.category && <Badge variant="outline">{h.category}</Badge>}
                {h.archivedAt && <Badge variant="secondary">Diarsipkan</Badge>}
              </div>
              {s && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.daysOfWeek.length === 0
                    ? "Setiap hari"
                    : `Hari: ${DAYS.filter((d) =>
                        s.daysOfWeek.includes(d.value),
                      )
                        .map((d) => d.label)
                        .join(", ")}`}{" "}
                  · {s.localTime} · {s.durationMinutes} menit
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(h.id);
                    const first = h.schedules[0];
                    setForm({
                      name: h.name,
                      category: h.category ?? "",
                      color: h.color,
                      localTime: first?.localTime ?? "07:00",
                      durationMinutes: first?.durationMinutes ?? 30,
                      daysOfWeek: first?.daysOfWeek ?? [],
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Ubah
                </Button>
                {h.archivedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unarchive.mutate({ id: h.id })}
                  >
                    Aktifkan lagi
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archive.mutate({ id: h.id })}
                  >
                    Arsipkan
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Hapus permanen? Riwayat kebiasaan ini ikut terhapus. Arsipkan saja kalau riwayat ingin tetap tersimpan.",
                      )
                    ) {
                      remove.mutate({ id: h.id });
                    }
                  }}
                >
                  Hapus permanen
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {habits.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada kebiasaan. Buat yang pertama lewat formulir di atas.
        </p>
      )}
    </div>
  );
}
