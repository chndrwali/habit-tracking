# Setup Perencana Kebiasaan

Aplikasi ini dibangun dari `chndrwali/nextjs-starter-kit` (Next.js 16, Better
Auth, tRPC, Prisma 7, PostgreSQL). Tanpa database dan env di bawah, halaman
aplikasi akan menampilkan error database — itu normal, bukan bug UI.

## 1. Database (Neon, gratis)

1. Buat project di Neon, salin connection string Postgres-nya.
2. Isi `DATABASE_URL` di `.env.local` (lokal) atau Vercel > Settings >
   Environment Variables (produksi).
3. Jalankan migrasi:
   ```bash
   npx prisma migrate deploy
   ```
   Migrasi yang ada: `20260222155729_add_model_auth` (bawaan starter) dan
   `20261028090000_habit_planner` (profil, habit, jadwal, occurrence,
   koneksi kalender).

## 2. Env wajib

```bash
NEXT_PUBLIC_URL=https://domain-kamu.vercel.app
BETTER_AUTH_URL=https://domain-kamu.vercel.app
BETTER_AUTH_SECRET=<string acak, minimal 32 karakter>
DATABASE_URL=postgresql://...
```

Lokal: ganti domain dengan `http://localhost:3000`, lalu `npm run dev`.

## 3. Google Calendar (opsional)

Tanpa langkah ini, habit/agenda/progres tetap jalan penuh. Halaman Kalender
akan menampilkan status `not_configured` sampai kredensial dipasang.

1. Google Cloud Console > buat project > APIs & Services > Library >
   aktifkan **Google Calendar API**.
2. OAuth consent screen: pilih External, isi nama aplikasi, tambahkan scope:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - (Test mode cukup untuk akun sendiri; tambahkan akunmu sebagai test user.)
3. Credentials > Create OAuth client ID > Web application. Authorized
   redirect URI:
   - Lokal: `http://localhost:3000/api/auth/callback/google`
   - Produksi: `https://domain-kamu.vercel.app/api/auth/callback/google`
4. Isi env lalu deploy ulang:
   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
5. Di aplikasi: daftar/masuk > halaman Kalender > Hubungkan Google > pilih
   kalender tujuan. Kirim item dari halaman Hari Ini.

## Versi package (28 Okt 2026)

Semua dependency di-update ke latest saat build ini, kecuali satu
pengecualian: **TypeScript ditahan di 5.9.x**. TypeScript 7.0 memecahkan
`eslint` (typescript-eslint yang dibundel `eslint-config-next` belum mendukung
TS 7), jadi lint gagal total di TS 7. Begitu typescript-eslint mendukung TS 7,
naikkan lagi tanpa perubahan kode lain yang diharapkan.

Catatan: `npm install` di mesin ini sempat gagal di postinstall Prisma
(`@prisma/engines` mengunduh schema-engine dari binaries.prisma.sh dan koneksi
di-reset proxy). Solusi lokal yang dipakai: `npm install --ignore-scripts`,
lalu unduh manual schema-engine untuk commit Prisma yang dipakai dan letakkan
di `node_modules/@prisma/engines/`, baru `prisma generate`. Di Vercel,
postinstall normal diharapkan jalan tanpa langkah ini.

## 4. Alur yang sudah bisa dipakai

Daftar/masuk (email + password) > Hari Ini (agenda per jam, tugas satu kali,
peringatan bentrok) > Kebiasaan (tambah/ubah/arsip/hapus) > Progres (ringkasan
mingguan, streak, riwayat 30 hari) > Pengaturan (zona waktu, awal pekan,
format waktu, pengingat) > Kalender (opsional, lihat langkah 3).

## Keputusan produk yang ditetapkan di v1

- Progres = selesai / (total − dilewati). Yang dilewati tidak menghukum
  progres dan bersifat netral untuk streak.
- Item pending dianggap `missed` setelah berakhir + grace period 30 menit.
- Perubahan jadwal habit hanya berlaku untuk occurrence mendatang; riwayat
  tidak ditulis ulang. Menggeser satu occurrence menghapus event Google
  lamanya, lalu sinkronisasi berikutnya membuat event baru.
- Sinkronisasi satu arah (aplikasi → Google Calendar), satu kalender tujuan
  per pengguna. Perubahan di Google Calendar tidak menimpa jadwal aplikasi.
- Memutus koneksi tidak menghapus event Google (kecuali event itu dihapus
  lewat perubahan/penghapusan item di aplikasi).
- Token Google disimpan oleh Better Auth di tabel `account` sisi server dan
  tidak pernah dikirim ke client.

## Batasan yang diketahui (jujur, belum dites live)

- Sinkronisasi Google Calendar ditulis lengkap (OAuth, refresh token,
  create/update/delete, mapping idempotent, retry), tapi **belum pernah
  dites dengan akun Google sungguhan** karena belum ada kredensial Google
  Cloud saat build ini. Tes live pertama wajib dilakukan setelah langkah 3.
- Tidak ada test otomatis di repo ini (starter kit tidak membawa test
  runner); pengujian dilakukan lewat typecheck, lint, dan production build.
- Tidak ada background worker/cron: status `missed` dihitung saat agenda
  dibuka, bukan oleh job terjadwal.
