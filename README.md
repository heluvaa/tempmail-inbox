# Tempmail Suite

Generator email sementara + pembaca inbox. Buat satu alamat, buat banyak sekaligus
(hingga 20) dengan log langsung, atau baca kotak masuknya di browser — tanpa daftar.

Ditenagai API publik [mail.tm](https://mail.tm) dan [mail.gw](https://mail.gw) lewat
proxy server sendiri (browser tidak bisa memanggil keduanya langsung karena tidak ada
header CORS).

## Fitur

- **Pilih mode** — tiga kartu di beranda: Generator, Bulk, Inbox. Mode tersimpan di
  URL hash (`#/gen`, `#/bulk`, `#/inbox`) sehingga bisa ditaut langsung dan tombol
  back browser tetap berfungsi.
- **Generator** — satu alamat baru sekali tekan, lengkap dengan alamat aktif, sandi,
  tombol salin, dan lompat ke inbox.
- **Bulk hingga 20 alamat** — antrean otomatis dengan jarak antar alamat (menghormati
  rate limit ±30 request/menit dari provider), log progres langsung, daftar hasil,
  salin semua sebagai teks, dan unduh JSON.
- **Inbox otomatis** — polling 10 detik untuk alamat aktif, tampil HTML (disanitize)
  dan teks, ekstrak link, deteksi kode OTP.
- **Riwayat multi-alamat** — alamat, sandi, dan token di `localStorage` browser saja;
  bisa ditandai aktif, hapus satu, atau hapus semua.
- **Pemilihan + status provider** — chip mail.tm / mail.gw dengan probe server-side.
  Kalau satu provider menolak, pembuatan alamat pindah otomatis ke provider lain.

## Keamanan

- Token JWT **tidak pernah** ditulis ke `console` dan tidak pernah disimpan di server.
- Token tidak ikut disalin/diunduh dari panel bulk — cukup alamat + sandi.
- Riwayat alamat hanya di `localStorage` browser pengguna.
- HTML email disanitize sebelum masuk DOM: `<script>`, `<iframe>`, event handler
  (`on*`), dan URL `javascript:`/`data:` dibuang.
- Proxy hanya meneruskan segmen yang diizinkan (`domains`, `accounts`, `token`,
  `messages`). Path lain ditolak `403`.

> ⚠️ Jangan pakai untuk data sensitif. Alamat sementara bisa hilang kapan saja.
>
> Alat ini hanya membuat dan membaca email sementara. Ia **tidak** mengaktifkan
> langganan premium aplikasi apa pun.

## Struktur

```
app/
  layout.tsx                   # shell + font + dekor blob
  page.tsx                     # render MailApp
  globals.css                  # design token (Tailwind 4 @theme)
  not-found.tsx
  api/mail/[...path]/route.ts  # PROXY multi-provider + probe /health
components/
  MailApp.tsx                  # orkestrator: state, routing hash, polling, riwayat
  ModeMenu.tsx                 # kartu pilihan mode
  GenPanel.tsx                 # generator satu alamat
  BulkPanel.tsx                # generator massal + log + unduh JSON
  LogPanel.tsx                 # konsol progres
  ProviderPicker.tsx           # chip provider + status + cek ulang
  ActiveCard.tsx, InboxList.tsx, MessageView.tsx, HistoryPanel.tsx
  Faq.tsx, Toaster.tsx, icons.tsx
lib/
  api.ts                       # klien proxy same-origin + fallback provider
  providers.ts                 # registry provider, urutan, jarak antrean bulk
  storage.ts                   # localStorage (accounts, aktif, mode, provider)
  names.ts                     # pembuat nama alamat acak
  format.ts                    # waktu, ekstrak link/kode, sanitasi HTML
  types.ts
```

## Jalankan lokal

```bash
npm install
npm run dev     # http://localhost:3200
```

## Deploy

Siap deploy ke Vercel tanpa konfigurasi tambahan. `app/api/mail/[...path]/route.ts`
berjalan sebagai serverless function.

```bash
vercel --prod
```

Tidak ada environment variable yang dibutuhkan.

### Catatan IP datacenter

Provider tempmail membatasi IP datacenter. Dari jaringan rumah request bisa lolos,
sementara dari egress serverless kadang dijawab 500 kosong. Karena itu proxy punya
retry dengan backoff, probe `/api/mail/health`, dan fallback otomatis antar provider.
Kalau kedua provider sedang menolak, UI menyebutkan penyebabnya alih-alih gagal diam-diam.

## Endpoint proxy

| Method     | Path                          | Diteruskan ke                     |
| ---------- | ----------------------------- | --------------------------------- |
| GET        | `/api/mail/health`            | probe semua provider              |
| GET        | `/api/mail/:p/domains`        | `GET :base/domains`               |
| POST       | `/api/mail/:p/accounts`       | `POST :base/accounts`             |
| POST       | `/api/mail/:p/token`          | `POST :base/token`                |
| GET        | `/api/mail/:p/messages`       | `GET :base/messages` (Bearer)     |
| GET        | `/api/mail/:p/messages/:id`   | `GET :base/messages/:id`          |
| PATCH      | `/api/mail/:p/messages/:id`   | `PATCH :base/messages/:id`        |

`:p` = `mailtm` (api.mail.tm) atau `mailgw` (api.mail.gw).

## Alur API (mail.tm / mail.gw)

1. `GET /domains` → ambil domain `isActive: true`.
2. `POST /accounts { address, password }` → buat akun.
3. `POST /token { address, password }` → token JWT.
4. `GET /messages?page=1` (header `Authorization: Bearer ***`) → polling 10 detik.
5. `GET /messages/{id}` → isi lengkap (`text` + `html`).
