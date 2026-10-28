# Front-End Flow Prompt Rules

Ikuti urutan langkah-langkah berikut ketika membuat halaman atau fungsionalitas front-end baru:

## 1. Konfirmasi Struktur Route

- Sebelum membuat halaman, **tanya dulu kepada pengguna** apakah route-nya menggunakan Route Group (misalnya `(admin)`, `(buyer)`) atau tidak.

## 2. Pembuatan Halaman (`page.tsx`)

- Buat file `page.tsx` di dalam folder route yang telah ditentukan.
- Tuliskan kode yang _clean_, mencakup Metadata, prefetch data via tRPC, dan menggunakan `HydrateClient`.
- Gunakan template standar berikut:

```tsx
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard", // Ubah sesuai halaman
  description: "Dashboard", // Ubah sesuai halaman
  robots: { index: false, follow: false },
};

export default async function Page() {
  // Ubah query prefetch sesuai kebutuhan data halaman ini
  await prefetch(trpc.example.get.queryOptions({ page: 1, limit: 10 }));

  return (
    <HydrateClient>
      {/* Panggil root component/section di sini */}
      <ExampleComponent />
    </HydrateClient>
  );
}
```

## 3. Struktur Folder Module UI

- Sebelum membuat komponennya, **tanya dulu kepada pengguna** nama spesifik folder module yang akan digunakan untuk menyimpan komponen-komponen UI tersebut.
- Buat folder di direktori `modules/[nama-module-spesifik]/ui`.
- Di dalam folder `ui` tersebut, buat dua sub-folder utama:
  - `/components`: Untuk menampung komponen-komponen kecil yang bersifat _reusable_ dan independen.
  - `/sections`: Untuk menampung seluruh _reusable component_ dengan ukuran yang lebih besar, biasanya merupakan gabungan beberapa komponen yang membentuk satu bagian khusus dalam satu halaman (misalnya `HeaderSection`, `HeroSection`, `TableSection`, dll).
