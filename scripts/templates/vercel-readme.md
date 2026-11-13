# ChatBotZ / RIFF Local AI

Chatbot bergaya metal hitam-merah. Model open-source Qwen 2.5 dijalankan **langsung di browser menggunakan WebLLM**, tanpa API inferensi cloud, tanpa API key, tanpa database, dan tanpa backend Payload/Figma.

## Menjalankan aplikasi

Gunakan Node.js **24.x** (atau Node >=22.12 yang kompatibel dengan Vite 8) dan pnpm 10.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

`pnpm dev` hanya untuk pengembangan lokal. Production terdiri dari file statis di `dist/`.

## Deploy ke Vercel

1. Push proyek ini ke repository GitHub. Jika disertakan di dalam proyek Figma Make, pertahankan folder **`web/`**.
2. Buka Vercel → **Add New → Project**.
3. Hubungkan akun GitHub dan pilih `VoxXx29/ChatBotZ`.
4. Root Directory: **`web`** jika file ini berada di `web/README.md`. Gunakan **`.`** hanya jika isi aplikasi mandiri ini memang berada langsung di root repository.
5. Framework Preset: **Vite**.
6. Node.js Version: **24.x**.
7. Install Command: **`pnpm install --frozen-lockfile`**.
8. Build Command: **`pnpm run build`**.
9. Output Directory: **`dist`**.
10. Tidak ada environment variable atau API key yang perlu diisi. Klik **Deploy**.

`vercel.json` sudah menyertakan framework, perintah instalasi/build, direktori output, dan header dasar. Setelah repository terhubung, push ke branch produksi akan memicu deployment baru.

Untuk repository yang masih memiliki proyek Figma di root, jangan ubah `package.json` utama dan jangan menambahkan `FIGMA_EID`. Vercel harus membaca **`web/package.json`**, dengan nama paket **`chatbotz-riff-local`** dan script build **`tsc --noEmit && vite build`**, bukan `payload build`. Pastikan `web/pnpm-lock.yaml`, `web/pnpm-workspace.yaml`, dan `web/.gitattributes` ikut terkirim. Pada pengaturan Root Directory Vercel, tidak perlu menyertakan file di luar folder `web`.

Vercel hanya meng-host frontend. AI tetap memakai GPU pengunjung, bukan server Vercel. Tidak ada file bobot model berukuran besar yang disimpan di repository atau di paket deployment; file model diunduh langsung dari Hugging Face/GitHub setelah pengunjung menekan **Aktifkan AI**.

## Push ke GitHub dengan aman

Jika folder ini adalah **`web/` di dalam repository Figma Make yang sudah ada**, jangan menjalankan `git init` di dalam `web`. Push/sinkronkan perubahan melalui repository yang sudah ada dan pastikan `web/package.json` muncul di GitHub. Petunjuk `git init` di bawah hanya untuk repository frontend baru yang kosong.

Jika repository tujuan **kosong**, jalankan dari folder yang berisi README ini:

```sh
git init -b main
git add .
git commit -m "Add RIFF browser AI app"
git remote add origin https://github.com/VoxXx29/ChatBotZ.git
git push -u origin main
```

Jika repository **sudah berisi file**, jangan force-push dan jangan menimpanya. Clone terlebih dahulu, lalu salin file ekspor ke **branch baru**:

```sh
git clone https://github.com/VoxXx29/ChatBotZ.git ChatBotZ
cd ChatBotZ
git switch -c riff-vercel
# Salin file ekspor ke folder ini, tanpa node_modules, dist, atau folder .git.
# Periksa setiap file yang bertabrakan sebelum menggantinya.
git status
git diff
git add <file-yang-memang-ingin-dikirim>
git commit -m "Add RIFF browser AI app"
git push -u origin riff-vercel
```

Buat Pull Request, periksa perubahannya, lalu merge. Jika GitHub meminta autentikasi, gunakan GitHub CLI (`gh auth login`) atau credential manager di komputermu. Jangan memasukkan token ke URL Git, source code, atau pesan chat.

Jangan commit `.env`, token, `node_modules`, `.vercel`, atau `dist`. Font di `public/fonts` adalah file font asli dengan lisensi OFL masing-masing; paket ekspor ini tidak membutuhkan Git LFS.

## Persyaratan AI lokal

- HTTPS (otomatis disediakan Vercel) atau localhost.
- Chrome/Edge terbaru dengan WebGPU dan akselerasi grafis yang berfungsi.
- GPU dengan memori memadai; pilihan model ringan memerlukan sekitar 1,1 GB, pilihan 1.5B sekitar 1,9 GB.
- Internet untuk mengunduh file model pertama kali. Cache browser bersifat best-effort; mode offline penuh tidak dijamin.

Jika WebGPU tidak tersedia, aplikasi menampilkan penjelasan dan tidak beralih diam-diam ke AI cloud. Kemampuan dan kualitas jawaban model kecil terbatas; periksa fakta penting. Aplikasi tidak melakukan pencarian web.

## “Ajari RIFF” bukan training bobot

Local Lab menyimpan catatan di localStorage dan memasukkan materi yang relevan ke konteks pertanyaan. Ini **basis pengetahuan lokal**, bukan model yang dilatih dari nol atau fine-tuning bobot.

Catatan hanya tersimpan di browser dan domain yang sama. **Sebelum pindah dari Figma Make ke domain Vercel, ekspor dataset JSON di Local Lab, lalu impor pada domain Vercel.** Riwayat chat hanya bertahan selama halaman terbuka; unduh lewat Export Log jika diperlukan.

Lihat `docs/local-ai.md` untuk batasan, perilaku Stop, dan pengujian. Pengujian browser dengan worker simulasi tidak membuktikan kualitas jawaban model; coba inferensi nyata pada perangkat WebGPU yang kompatibel.

## Sumber dan pembaruan

Proyek ini adalah snapshot frontend dari RIFF di Figma Make. Backend/admin Figma tidak disertakan. Setelah UI di Figma berubah, ekspor ulang ke folder baru, periksa diff, dan kirim perubahan ke branch GitHub; jangan mengganti source secara buta.

Dependensi frontend memakai versi publik npm, bukan paket internal Figma. Lisensi model dan dependensi tetap mengikuti masing-masing penerbit.
