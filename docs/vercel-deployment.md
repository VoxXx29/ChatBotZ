# Ekspor RIFF untuk GitHub dan Vercel

Jangan deploy root proyek Figma Make ini langsung ke Vercel: root masih menggunakan Payload dan integrasi platform Figma. Gunakan ekspor frontend mandiri.

## Folder siap pakai di repository ini

Versi mandiri sudah disertakan langsung di **`web/`**, sehingga tidak perlu mengunduh tautan ZIP dari chat.

1. Pastikan perubahan folder `web/` sudah dipush/disinkronkan ke repository `VoxXx29/ChatBotZ`.
2. Buka `web/package.json` di GitHub: nama paket harus **`chatbotz-riff-local`**, bukan `figma-make-app`.
3. Di Vercel, pilih **Root Directory `web`**, Framework **Vite**, Node.js **24.x**, lalu simpan.
4. Gunakan instalasi `pnpm install --frozen-lockfile`, build `pnpm run build`, dan output `dist`. Jangan menyertakan file dari luar Root Directory.
5. Deploy ulang commit terbaru tanpa memakai build cache lama.

`package.json` utama tetap untuk Figma Make. Jangan menggantinya dan jangan menambahkan `FIGMA_EID` atau secret Figma di Vercel. Log deployment yang benar menyebut **`chatbotz-riff-local`** dan **`vite build`**, bukan **`payload build`**.

Folder `web` adalah snapshot source yang terpisah, bukan salinan otomatis setiap kali UI utama diedit. Untuk pembaruan, ekspor ke direktori baru lalu tinjau dan salin perubahan yang diperlukan. `.gitattributes` lokal di dalam snapshot memastikan font tidak berubah menjadi pointer Git LFS ketika folder ini dipush bersama proyek Make.

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

Jika menggunakan repository Make yang sama, push **folder `web/`** dan arahkan Vercel ke `web`. Jika membuat repository frontend terpisah, push **isi folder ekspor** dan arahkan Vercel ke `.`. Ikuti README hasil ekspor. Untuk repository yang sudah berisi file, gunakan branch baru dan periksa konflik; jangan force-push.

Token GitHub tidak diperlukan untuk menjalankan aplikasi. Jika akses push perlu diperbarui, gunakan otorisasi GitHub yang valid; jangan menaruh kredensial dalam source, URL remote, dokumentasi, atau chat.

## Vercel

| Pengaturan            | Nilai                                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| Repository            | `VoxXx29/ChatBotZ`                                                            |
| Root Directory        | `web` untuk repository Make ini; `.` hanya untuk repository frontend terpisah |
| Framework             | Vite                                                                          |
| Node.js               | 24.x                                                                          |
| Install Command       | `pnpm install --frozen-lockfile`                                              |
| Build Command         | `pnpm run build`                                                              |
| Output Directory      | `dist`                                                                        |
| Environment Variables | Tidak diperlukan                                                              |

Halaman `/` adalah frontend statis. Tidak ada server/API AI yang harus dijalankan di Vercel. Tetap diperlukan perangkat pengunjung yang mendukung WebGPU dan akses unduhan file model. Simpan/ekspor materi Local Lab sebelum pindah domain; localStorage tidak mengikuti perpindahan domain.

Proyek Figma Make asli beserta lifecycle scripts dan konfigurasi Payload tetap dipertahankan.
