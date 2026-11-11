# QQ Peduli — Frontend + Backend (Vercel)

Struktur:
```
public/index.html      aplikasi (otomatis terhubung ke /api jika backend aktif)
public/relawan.html    panel relawan: kirim GPS ambulans + ubah status
api/                   fungsi serverless (auth, campaigns, donations, midtrans-webhook, ambulance, health)
lib/                   koneksi database & helper
db/schema.sql          tabel + data awal
.env.example           daftar environment variables
```

## Langkah deploy

1. **Unggah ke GitHub.** Buat repo baru (private), lalu:
   `git init && git add . && git commit -m "init" && git branch -M main`
   `git remote add origin <URL-REPO> && git push -u origin main`
2. **Buat database.** Di vercel.com → Storage (atau Marketplace) → **Neon Postgres** → Create. Salin `DATABASE_URL`. Buka **SQL Editor** Neon, tempel isi `db/schema.sql`, lalu Run.
3. **Import ke Vercel.** Add New → Project → pilih repo. Framework Preset: **Other**. Output Directory: `public` (sudah diatur di `vercel.json`).
4. **Isi Environment Variables** (Settings → Environment Variables), lihat `.env.example`:
   - `DATABASE_URL` dari Neon
   - `JWT_SECRET` buat dengan `openssl rand -hex 32`
   - `MIDTRANS_SERVER_KEY` (Server Key **Sandbox** dulu) dan `MIDTRANS_IS_PRODUCTION=false`
   - `VOLUNTEER_KEY` kunci rahasia untuk relawan
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (opsional, notifikasi permintaan ambulans)
5. **Deploy.** Klik Deploy. Tes: buka `https://<proyekmu>.vercel.app/api/health` → harus `{"ok":true}`.
6. **Atur Midtrans** (dashboard Midtrans → Settings → Configuration):
   - Payment Notification URL: `https://<proyekmu>.vercel.app/api/midtrans-webhook`
   - Finish/Unfinish/Error Redirect URL: `https://<proyekmu>.vercel.app/`
   - Uji dengan akun Sandbox. Pindah ke Production hanya setelah akun Midtrans terverifikasi: ganti Server Key Production dan `MIDTRANS_IS_PRODUCTION=true`.
7. **Telegram (opsional).** Buat bot lewat @BotFather, ambil token; tambahkan bot ke grup relawan, ambil `chat_id`.
8. **Relawan.** Buka `https://<proyekmu>.vercel.app/relawan.html` di HP relawan, isi kunci relawan + ID permintaan, tekan *Mulai bagikan lokasi*. Pemohon langsung melihat posisi dan jarak ambulans.
9. **Domain sendiri.** Vercel → Settings → Domains → tambahkan domain lalu ikuti petunjuk DNS.

## Uji lokal
`npm i -g vercel && npm install && vercel dev` (isi `.env.local` dari `.env.example`).

## Keamanan & catatan
- Jangan commit `.env`. Ganti semua kunci contoh.
- Donasi baru dihitung **setelah webhook Midtrans terverifikasi** (signature SHA-512), bukan dari klien.
- Lokasi GPS pengguna dikirim ke server saat meminta ambulans; sampaikan ini di kebijakan privasi.
- Belum ada: pembatasan laju (rate limit), reset password, verifikasi email, dan panel admin. Tambahkan sebelum dipakai publik luas.
- Kode ini belum diuji terhadap database dan Midtrans sungguhan; uji di Sandbox dulu.
