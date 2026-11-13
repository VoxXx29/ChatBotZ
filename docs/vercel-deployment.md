# Ekspor RIFF untuk GitHub dan Vercel

Jangan deploy root proyek Figma Make ini langsung ke Vercel: root masih menggunakan Payload dan integrasi platform Figma. Gunakan ekspor frontend mandiri.

## Membuat snapshot

Dari root proyek:

```sh
node scripts/export-vercel.mjs
pnpm --dir exports/riff-vercel install
pnpm --dir exports/riff-vercel test
pnpm --dir exports/riff-vercel build
```

Perintah ekspor hanya menulis direktori tujuan yang kosong dan tidak menghapus/menimpa file yang sudah ada. Untuk ekspor berikutnya, pilih direktori baru:

```sh
node scripts/export-vercel.mjs exports/riff-vercel-next
```

Yang disertakan: komponen UI/browser AI, worker, CSS, font lokal beserta lisensi, pengujian, konfigurasi Vite/Vercel, dan petunjuk deployment. Yang tidak disertakan: `.env`, kredensial, backend/admin Payload, konfigurasi Figma, node_modules, file model, dan riwayat Git internal.

`pnpm install` membuat `pnpm-lock.yaml` di dalam ekspor. **Sertakan lockfile tersebut ketika push**; instalasi di Vercel memakai `--frozen-lockfile`.

## GitHub

Repository tujuan: `https://github.com/VoxXx29/ChatBotZ`.

Push **isi folder ekspor**, bukan root proyek Make. Ikuti README hasil ekspor. Untuk repository yang sudah berisi file, gunakan branch baru dan periksa konflik; jangan force-push.

Token GitHub tidak diperlukan untuk menjalankan aplikasi. Jika akses push perlu diperbarui, gunakan otorisasi GitHub yang valid; jangan menaruh kredensial dalam source, URL remote, dokumentasi, atau chat.

## Vercel

| Pengaturan            | Nilai                                   |
| --------------------- | --------------------------------------- |
| Repository            | `VoxXx29/ChatBotZ`                      |
| Root Directory        | `.` jika isi ekspor berada di root repo |
| Framework             | Vite                                    |
| Node.js               | 24.x                                    |
| Install Command       | `pnpm install --frozen-lockfile`        |
| Build Command         | `pnpm run build`                        |
| Output Directory      | `dist`                                  |
| Environment Variables | Tidak diperlukan                        |

Halaman `/` adalah frontend statis. Tidak ada server/API AI yang harus dijalankan di Vercel. Tetap diperlukan perangkat pengunjung yang mendukung WebGPU dan akses unduhan file model. Simpan/ekspor materi Local Lab sebelum pindah domain; localStorage tidak mengikuti perpindahan domain.

Proyek Figma Make asli beserta lifecycle scripts dan konfigurasi Payload tetap dipertahankan.
