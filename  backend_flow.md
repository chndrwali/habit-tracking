# Backend Flow Prompt Rules

Ikuti urutan langkah-langkah berikut ketika membuat atau menambahkan fungsionalitas backend baru:

## 1. Buat Schema Prisma Terlebih Dahulu

- Langkah pertama yang **wajib** dilakukan adalah membuat atau memperbarui schema database menggunakan Prisma.
- Selesaikan seluruh definisi schema (model, relasi, tipe data) sebelum berlanjut ke langkah berikutnya.
- Jangan lupa untuk menjalankan `npx prisma generate` dan `npx prisma migrate dev` setelah selesai.

## 2. Buat Form Schema (Zod) & Form Type

- Setelah schema Prisma selesai dan sudah dipastikan kebenarannya, buat validasi form menggunakan **Zod**.
- Tambahkan schema Zod ini di dalam folder `lib/form-schema.ts`.
- Jangan lupa untuk membuat dan mengekspor TypeScript type (inferensi) berdasarkan schema Zod tersebut (contoh: `export type MyFormType = z.infer<typeof mySchema>`).

## 3. Buat Router tRPC

- Sebelum membuat router, **tanyakan dulu kepada pengguna** spesifik folder modul apa yang akan digunakan.
- Setelah mendapatkan nama folder, buat file routers tRPC di dalam folder `/modules/[nama-module-spesifik]/server/`.
- Gunakan Zod schema dari langkah ke-2 untuk validasi input (`input()`) pada mutasi atau query, dan integrasikan dengan operasi database menggunakan Prisma dari langkah ke-1.

## 4. Tambahkan Fungsi tRPC (Prosedur)

Pastikan router tRPC yang dibuat memiliki fungsi operasi standar (CRUD) berikut ini:

- **`getList`**: Buat prosedur (query) untuk mengambil daftar data dengan dukungan _pagination_, _filtering_, dan _searching_.
- **`getById`**: Buat prosedur (query) untuk mengambil spesifik satu data menggunakan operasi `findUnique`.
- **`create`**: Buat prosedur (mutation) untuk menambahkan data baru.
- **`update`**: Buat prosedur (mutation) untuk memperbarui data yang sudah ada.
- **`delete`**: Buat prosedur (mutation) untuk menghapus satu data.
- **`bulkDelete`**: Buat prosedur (mutation) untuk menghapus banyak data sekaligus.
- **Integrasi UploadThing**: Jika di dalam tabel tersebut terdapat _field_ gambar, **wajib** buatkan juga logika/trigger untuk menghapus file gambar fisik yang ada di UploadThing ketika menjalankan mutasi _delete_ dan _bulk delete_.

## 5. Import ke Main tRPC Router

- Setelah router dibuat, import router tersebut ke dalam konfigurasi utama tRPC.
- Tambahkan import dan daftarkan router ke dalam `trpc/routers/_app.ts`.
