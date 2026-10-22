# Agranusa Signature Villa Asset - Paket GitHub + Vercel + APK

Paket ini berisi aplikasi aset villa yang siap dipasang di **GitHub**, di-hosting di **Vercel**, lalu dijadikan **APK Android**.
Data tetap disimpan di **Google Sheets** milik Anda lewat **Google Apps Script** (gratis).

```
HP / APK  --->  Vercel (tampilan aplikasi)  --->  Apps Script (API)  --->  Google Sheets (data)
```

## Isi paket

```
README.md                      panduan ini
vercel.json                    pengaturan Vercel (jangan diubah)
.gitignore
public/                        INI yang tampil di Vercel dan menjadi APK
  index.html                   aplikasi
  config.js                    <-- WAJIB diisi alamat API Apps Script (Langkah 2)
  manifest.webmanifest         data aplikasi (nama, ikon, warna)
  sw.js                        service worker (cepat dan tahan sinyal lemah)
  icons/                       ikon aplikasi dari logo Agranusa
  .well-known/assetlinks.json  dipakai nanti agar APK tanpa bilah alamat (Langkah 6)
apps-script/
  Code.gs                      WAJIB: salin ke Google Apps Script
  appsscript.json              opsional (pengaturan proyek)
  Index.html                   opsional: tampilan versi lama di dalam Apps Script
```

Yang Anda butuhkan: akun Google, akun GitHub, dan akun Vercel (daftar gratis, pilih "Continue with GitHub").

---

## Langkah 1 - Pasang backend di Apps Script (sekali saja)

1. Buka proyek Apps Script Anda yang sudah ada (atau buat baru di https://script.google.com).
2. Buka file `Code.gs`, hapus isinya, lalu tempel seluruh isi `apps-script/Code.gs` dari paket ini. Simpan.
   File `Index` yang lama boleh dibiarkan atau dihapus. Versi Vercel tidak memakainya.
3. Jika proyek ini baru: pilih fungsi `setup` di daftar fungsi, klik **Jalankan**, lalu setujui izinnya.
4. Klik **Deploy > Deployment baru** (atau **Kelola deployment > Edit > Versi baru** jika sudah ada).
   - Jenis: **Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Siapa yang memiliki akses: **Siapa saja** (wajib, supaya HP dan APK bisa mengakses)
   - Klik **Deploy**, lalu **salin URL Aplikasi web** (berakhiran `/exec`).
5. **Sangat disarankan - pasang kode akses.** Karena aksesnya "Siapa saja", tanpa kode siapa pun yang tahu URL bisa melihat dan mengubah data.
   Di Apps Script buka **Setelan proyek** (ikon roda gigi) > **Properti skrip** > **Tambah properti skrip**:
   - Properti: `KODE_AKSES`
   - Nilai: kode rahasia Anda (minimal 8 karakter, campur huruf dan angka)
   Setelah ini, setiap perangkat diminta memasukkan kode itu satu kali.
6. Tes: buka URL `/exec` di browser. Muncul tulisan **"Layanan API aktif"** (atau tampilan aplikasi lama jika file `Index` masih ada). Itu tandanya benar.

## Langkah 2 - Isi alamat API

Buka `public/config.js` dan isi alamatnya:

```js
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycb.../exec"
};
```

Jika dikosongkan, aplikasi berjalan dalam **MODE DEMO** (data contoh, tidak tersimpan).

## Langkah 3 - Unggah ke GitHub

1. Buka https://github.com/new, beri nama repositori (mis. `agranusa-aset`), pilih **Private** (disarankan), lalu **Create repository**.
2. Klik **uploading an existing file**, lalu seret **seluruh isi** folder paket ini (`public`, `apps-script`, `vercel.json`, `README.md`, `.gitignore`). Klik **Commit changes**.
3. Cek folder tersembunyi: pastikan ada `public/.well-known/assetlinks.json`. Jika tidak ada (sebagian komputer menyembunyikan folder berawalan titik):
   **Add file > Create new file**, ketik nama `public/.well-known/assetlinks.json`, isi dengan `[]`, lalu commit.

Cara lain lewat terminal (bila Git terpasang):

```bash
cd folder-paket
git init
git add .
git commit -m "Agranusa Aset"
git branch -M main
git remote add origin https://github.com/USERNAME/agranusa-aset.git
git push -u origin main
```

## Langkah 4 - Hosting di Vercel

1. Buka https://vercel.com/new dan pilih repositori `agranusa-aset` (**Import**).
2. Pengaturan: **Framework Preset: Other**, **Root Directory: ./**, **Build Command**: kosongkan. **Output Directory** akan terisi `public` dari `vercel.json`.
3. Klik **Deploy**. Hasilnya alamat seperti `https://agranusa-aset.vercel.app`.
4. Buka alamat itu di HP. Jika diminta, masukkan kode akses. Coba tambah satu barang untuk memastikan data masuk ke Google Sheets.

Setiap kali Anda mengubah file di GitHub, Vercel memperbarui situs otomatis.

## Langkah 5 - Pasang sebagai aplikasi (tanpa APK)

Di Chrome Android buka alamat Vercel, tekan menu titik tiga, lalu **Instal aplikasi** (atau **Tambahkan ke layar utama**). Ikon Agranusa muncul di layar HP dan aplikasi terbuka layar penuh.

## Langkah 6 - Jadikan APK (cara termudah: PWABuilder)

1. Buka https://www.pwabuilder.com, tempel alamat Vercel Anda, klik **Start**. Pastikan manifest dan service worker terdeteksi.
2. Klik **Package for stores > Android**. Isi:
   - **Package ID**: `com.agranusa.aset` (huruf kecil, tanpa spasi)
   - **App name**: Agranusa Signature Villa Asset, **Short name**: Agranusa Aset
   - **App version**: 1.0.0 dan **version code**: 1
   - **Signing key**: pilih **Create new**
3. Klik **Generate**, lalu unduh file zip hasilnya. Isinya:
   - `*.apk` - untuk dipasang langsung di HP
   - `*.aab` - untuk diunggah ke Google Play (opsional)
   - `signing.keystore` dan `signing-key-info.txt` - **simpan baik-baik, jangan hilang dan jangan diunggah ke GitHub**
   - `assetlinks.json` - dipakai di langkah 5 di bawah
4. Pasang APK: kirim file `.apk` ke HP, buka, lalu izinkan **Instal dari sumber tidak dikenal** bila diminta.
5. **Hilangkan bilah alamat Chrome di APK**: buka `assetlinks.json` dari zip PWABuilder, salin seluruh isinya ke `public/.well-known/assetlinks.json` di GitHub, lalu commit. Tunggu Vercel selesai deploy. Cek bahwa `https://alamat-anda.vercel.app/.well-known/assetlinks.json` menampilkan isinya. Buka ulang APK.
   Tanpa langkah ini aplikasi tetap jalan, hanya ada bilah alamat di bagian atas.

Pembaruan: APK memuat situs Vercel Anda, jadi perubahan di GitHub langsung terlihat di aplikasi tanpa membuat APK baru. APK baru hanya perlu jika nama, ikon, atau Package ID berubah.

### Alternatif: Capacitor (butuh Android Studio dan Node.js)

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Agranusa Aset" com.agranusa.aset --web-dir public
npx cap add android
npx cap sync
npx cap open android     # di Android Studio: Build > Build APK(s)
```

Jika kamera tidak terbuka di APK Capacitor, tambahkan izin `android.permission.CAMERA` di `android/app/src/main/AndroidManifest.xml`.

---

## Keamanan

- Pasang `KODE_AKSES` (Langkah 1, nomor 5). Kode tersimpan di perangkat setelah dimasukkan satu kali. Untuk mencabut akses semua perangkat, ganti nilai `KODE_AKSES`.
- Gunakan repositori GitHub **Private**.
- Cadangkan Google Sheets secara rutin (**File > Buat salinan**).
- Jangan unggah file `*.keystore` ke GitHub (sudah dikecualikan di `.gitignore`).

## Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Banner **MODE DEMO** | `API_URL` di `config.js` masih kosong atau salah. Isi lalu commit. Tutup dan buka ulang aplikasi dua kali. |
| "Tidak bisa terhubung ke server" | Internet mati, URL salah, akses deployment bukan **Siapa saja**, atau belum membuat **Versi baru** setelah mengganti `Code.gs`. |
| Selalu diminta kode akses | Kode salah. Cek nilai `KODE_AKSES` di Properti skrip. |
| Perubahan tidak muncul | Service worker menyimpan salinan lama. Tutup lalu buka aplikasi dua kali, atau hapus data situs di pengaturan Chrome. |
| Vercel menampilkan 404 | Pastikan `vercel.json` ada di akar repositori dan `Output Directory` bernilai `public`. |
| Scan dan cetak QR pertama kali lambat | Pustaka QR dimuat dari internet saat pertama dipakai. Setelah itu tersimpan di perangkat. |
| Bilah alamat masih muncul di APK | `assetlinks.json` belum diisi atau belum ter-deploy (Langkah 6, nomor 5). |
| Tombol cetak tidak membuka dialog di APK | Gunakan **Unduh gambar QR (PNG)** di layar cetak, atau buka aplikasi lewat Chrome. |

Uji cepat backend: di Apps Script pilih fungsi `cekSistem` lalu **Jalankan**. Hasil tiap langkah tampil di Log eksekusi.

## Memperbarui aplikasi di kemudian hari

- Perubahan tampilan: ganti `public/index.html` di GitHub.
- Perubahan backend: ganti `Code.gs` di Apps Script, lalu **Deploy > Kelola deployment > Edit > Versi baru**.
