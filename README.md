# Perencana Kebiasaan

Daily Habit Planner & Google Calendar Integration — dibangun dari
`chndrwali/nextjs-starter-kit` (Next.js 16, React 19, Better Auth, tRPC v11,
Prisma 7, PostgreSQL, shadcn/ui, Tailwind v4).

Rencanakan hari berdasarkan waktu, bukan sekadar checklist: kebiasaan
berulang, agenda harian per jam, riwayat progres, dan sinkronisasi item
terpilih ke Google Calendar tanpa event duplikat.

## Fitur

- **Hari Ini** — agenda kronologis per jam, tugas satu kali, peringatan
  jadwal bentrok, aksi selesai/lewati, kirim item ke Google Calendar.
- **Kelola Kebiasaan** — tambah, ubah, arsipkan, atau hapus permanen.
  Perubahan jadwal hanya berlaku untuk hari mendatang; riwayat tidak diubah.
- **Progres & Riwayat** — ringkasan mingguan, streak per kebiasaan, riwayat
  30 hari terakhir.
- **Pengaturan** — zona waktu, awal pekan, format waktu 12/24 jam, pengingat
  default Google Calendar.
- **Google Calendar** — hubungkan akun, pilih kalender tujuan, status
  sinkronisasi (connected / pending / synced / failed / disconnected), dan
  retry tanpa duplikasi event.
- **Masuk & Akun** — daftar, masuk, keluar lewat Better Auth (email +
  password, plus Google bila OAuth dikonfigurasi).

## Mulai

Lihat **SETUP.md** untuk database (Neon), env, migrasi Prisma, dan setup
Google Cloud OAuth. Ringkasnya:

```bash
cp .env.example .env.local   # isi DATABASE_URL dkk.
npm install
npx prisma migrate deploy
npm run dev
```

Perintah verifikasi: `npm run typecheck`, `npm run lint`, `npm run build`.

## Struktur penting

- `prisma/schema.prisma` + `prisma/migrations/20261028090000_habit_planner/`
  — model produk (auth Better Auth tidak diubah).
- `lib/timezone.ts`, `lib/agenda.ts` — recurrence dan materialisasi
  occurrence per hari dalam timezone profil pengguna.
- `lib/google-calendar.ts` — klien Calendar API + refresh token, token tidak
  pernah ke client.
- `trpc/routers/` — `habits`, `agenda`, `progress`, `settings`, `calendar`.
- `app/(app)/` — halaman aplikasi (butuh login): `hari-ini`, `kebiasaan`,
  `progres`, `kalender`, `pengaturan`.
