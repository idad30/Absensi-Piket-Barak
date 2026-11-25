# Setup WhatsApp Cloud API — Absensi MB Lodaya 19

## Data yang diperlukan
- Firebase project yang sudah mengaktifkan Authentication, Firestore, Storage, dan Cloud Functions.
- Meta WhatsApp Business Platform: Phone Number ID, access token, nomor tujuan admin, dan template pesan berbahasa Indonesia yang sudah disetujui.
- Jangan pernah menaruh access token di `index.html`, file konfigurasi frontend, atau repository publik.

## Secret backend
Dari folder project Firebase, jalankan perintah berikut satu per satu. Isi nilainya di terminal saat diminta:

```bash
firebase functions:secrets:set WA_ACCESS_TOKEN
firebase functions:secrets:set WA_PHONE_NUMBER_ID
firebase functions:secrets:set WA_ADMIN_TO
firebase functions:secrets:set WA_TEMPLATE_NAME
firebase functions:secrets:set WA_GRAPH_API_VERSION
```

Nomor tujuan gunakan format internasional tanpa tanda plus, contoh format: 62xxxxxxxxxxx. Untuk versi Graph API, isi versi yang aktif di aplikasi Meta milikmu.

## Template WhatsApp
Buat template utility bernama `laporan_piket_lodaya`, bahasa Indonesian (id), dengan isi body yang memiliki enam variabel:

```
Laporan absensi piket MB Lodaya 19

Nama: {{1}}
Tanggal: {{2}}
Hari: {{3}}
Status: {{4}}
Foto BEFORE: {{5}}
Foto AFTER: {{6}}
```

Ajukan template untuk persetujuan Meta. Pastikan template berisi enam placeholder body sesuai urutan di atas. Cloud API menggunakan template yang disetujui untuk notifikasi yang dimulai oleh sistem.

## Deploy
```bash
firebase deploy --only firestore:rules,storage,functions
```

## Bentuk dokumen Firestore
Buat dokumen baru di koleksi `attendance` dengan field:
- `createdBy`: UID Firebase anggota yang mengirim absensi
- `memberName`: nama anggota
- `date`: tanggal format YYYY-MM-DD
- `day`: nama hari
- `status`: hadir / izin / alpa
- `beforePhotoUrl`: URL foto BEFORE yang sudah diunggah ke Firebase Storage
- `afterPhotoUrl`: URL foto AFTER yang sudah diunggah ke Firebase Storage

Cloud Function akan mengirim template ke nomor admin dan menulis `waStatus` (sent/failed/skipped) serta ID pesan atau error ke dokumen tersebut.

## Penting
File frontend saat ini masih merupakan demo penyimpanan lokal. Untuk mengaktifkan absensi online lintas perangkat, perlu menghubungkan Firebase Authentication, Firestore, dan Storage pada frontend, mengubah submit absensi agar mengunggah dua foto lalu membuat dokumen Firestore. Jangan memasukkan token WhatsApp ke frontend. Rules di repo membatasi pembuatan data kepada pengguna login dan pembacaan riwayat kepada akun dengan custom claim `admin: true`.
