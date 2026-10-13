# Tempmail Inbox

Web inbox email sementara. Buat alamat sekali pakai, terima pesan langsung di browser — tanpa daftar, tanpa email pribadi.

Ditenagai API publik [mail.tm](https://mail.tm) lewat proxy server sendiri (browser tidak bisa memanggil mail.tm langsung karena tidak ada header CORS).

## Fitur

- **Buat alamat 1 klik** — domain diambil otomatis dari domain `isActive: true`.
- **Salin alamat & password** — password ditampilkan dan bisa disalin.
- **Inbox otomatis** — polling tiap **10 detik**, hanya untuk alamat yang aktif.
- **Riwayat multi-alamat** — tersimpan di `localStorage` (alamat, password, token, waktu dibuat); bisa ditandai aktif, dihapus satu, atau dihapus semua.
- **Baca isi lengkap** — tampilan HTML (di-sanitize) dan teks, plus tombol **ekstrak link** dan **deteksi kode OTP**.
- **Mobile-first**, Bahasa Indonesia, tema playful (grafik flat, tanpa library UI).

## Keamanan

- Token JWT **tidak pernah** ditulis ke `console`, dan tidak pernah disimpan di server.
- Riwayat alamat hanya di `localStorage` browser pengguna.
- HTML email yang dirender sudah dibersihkan: `<script>`, `<iframe>`, event handler (`on*`), dan URL `javascript:`/`data:` dibuang sebelum masuk DOM.

> ⚠️ Jangan pakai untuk data sensitif. Alamat sementara bisa hilang kapan saja.

## Struktur

```
app/
  layout.tsx                 # shell + font + dekor blob
  page.tsx                   # render MailApp
  globals.css                # design token (Tailwind 4 @theme)
  not-found.tsx
  api/mail/[...path]/route.ts  # PROXY ke api.mail.tm (server-side)
components/
  MailApp.tsx                # orkestrator: state, polling, riwayat, aksi
  ActiveCard.tsx             # alamat aktif + tombol generate/salin
  InboxList.tsx              # daftar pesan + status
  MessageView.tsx            # isi email + ekstrak link/kode
  HistoryPanel.tsx           # riwayat multi-alamat
  Faq.tsx, Toaster.tsx, icons.tsx
lib/
  api.ts                     # klien proxy same-origin
  storage.ts                 # localStorage (accounts, active)
  format.ts                  # waktu, ekstrak link/kode, sanitasi HTML
  types.ts
```

## Jalankan lokal

```bash
npm install
npm run dev     # http://localhost:3200
```

## Deploy

Proyek ini siap deploy ke Vercel tanpa konfigurasi tambahan. Route `app/api/mail/[...path]/route.ts` berjalan sebagai serverless function dan meneruskan permintaan ke `api.mail.tm`.

```bash
vercel --prod
```

Tidak ada environment variable yang dibutuhkan.

## Endpoint proxy

| Method | Path                    | Diteruskan ke                    |
| ------ | ----------------------- | -------------------------------- |
| GET    | `/api/mail/domains`     | `GET /domains`                   |
| POST   | `/api/mail/accounts`    | `POST /accounts`                 |
| POST   | `/api/mail/token`       | `POST /token`                    |
| GET    | `/api/mail/messages`    | `GET /messages` (Bearer token)   |
| GET    | `/api/mail/messages/:id`| `GET /messages/:id`              |

Hanya segmen pertama (`domains`, `accounts`, `token`, `messages`) yang diizinkan — request ke path lain ditolak `403`.

## Alur API (mail.tm)

1. `GET /domains` → ambil domain `isActive: true`.
2. `POST /accounts { address, password }` → buat akun.
3. `POST /token { address, password }` → token JWT.
4. `GET /messages` (header `Authorization: Bearer <token>`) → polling 10 detik.
5. `GET /messages/{id}` → isi lengkap (`text` + `html`).