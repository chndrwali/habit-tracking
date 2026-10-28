import Link from "next/link";
import { Button } from "@/components/ui/button";

const SAMPLE_DAY = [
  { time: "06:30", title: "Olahraga pagi", color: "#16A34A" },
  { time: "08:00", title: "Fokus kerja — blok pertama", color: "#2563EB" },
  { time: "12:30", title: "Baca buku 30 menit", color: "#7C3AED" },
  { time: "20:00", title: "Jurnal & persiapan besok", color: "#DB2777" },
];

export const metadata = {
  title: "Perencana Kebiasaan — Rencanakan hari berdasarkan waktu",
  description:
    "Habit tracking, agenda harian per jam, riwayat progres, dan sinkronisasi Google Calendar dalam satu alur.",
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        Perencana Kebiasaan · Daily Habit Planner
      </p>
      <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">
        Rencanakan hari berdasarkan waktu, bukan sekadar checklist.
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Buat kebiasaan berulang, lihat agenda harianmu dalam urutan jam, tandai
        yang selesai, dan kirim item terpilih ke Google Calendar — tanpa event
        duplikat saat jadwal berubah.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/register">Mulai gratis</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Masuk</Link>
        </Button>
      </div>

      <section className="mt-12 rounded-lg border p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Contoh satu hari
        </h2>
        <ol className="space-y-3">
          {SAMPLE_DAY.map((item) => (
            <li key={item.time} className="flex gap-3">
              <span className="w-12 shrink-0 text-sm font-medium tabular-nums">
                {item.time}
              </span>
              <span
                className="mt-1 h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="self-center">{item.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-bold">Cara kerjanya</h2>
        <ol className="space-y-3">
          <li>
            <strong>1. Buat kebiasaan.</strong> Nama, hari berulang, jam, dan
            durasi. Satu kebiasaan, satu jadwal.
          </li>
          <li>
            <strong>2. Lihat agenda hari ini.</strong> Item tersusun kronologis
            per jam, lengkap dengan peringatan bila ada jadwal yang bentrok.
          </li>
          <li>
            <strong>3. Tandai dan kirim.</strong> Selesai, lewati, atau biarkan
            terlewat — riwayat tetap tersimpan. Item terpilih bisa dikirim ke
            Google Calendar dan diperbarui di event yang sama saat jadwal
            berubah.
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Aplikasi tetap bisa dipakai penuh tanpa Google Calendar. Sinkronisasi
          kalender aktif setelah OAuth Google dikonfigurasi (lihat SETUP.md).
        </p>
      </section>
    </main>
  );
}
