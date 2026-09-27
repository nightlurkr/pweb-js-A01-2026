# Mini Shopee  Praktikum Modul 2 (JavaScript)

Pemrograman Web (ET234305) — Kelompok **A01**

| Nama | NRP | Bagian |
|---|---|---|
| Ryan Adya Purwanto | 5027231046 | Login Page, Auth Guard, Navbar, Search/Filter/Sorting, Keranjang |
| George David Nebore | 5027221043 | Fetch produk, Card Grid, Load More, Modal Detail |
| Kharisma Fahrun Nisa' | 5027231086 | — |

Aplikasi e-commerce dua halaman, dibuat **native** tanpa framework atau library
apa pun. Data diambil dinamis dari `dummyjson.com`.

---

## Cara menjalankan

```bash
python -m http.server 5500
```

Lalu buka <http://localhost:5500/login.html>

Alasannya: `localStorage` bersifat per-origin, dan Firefox memberi origin unik
ke setiap file yang dibuka lewat `file://` (setelan `privacy.file_unique_origin`,
aktif secara default). Akibatnya sesi login yang disimpan di `login.html` tidak
terbaca di `index.html`. Dijalankan lewat HTTP, kedua halaman punya origin yang
sama sehingga sesinya menyatu.

Login uji coba: username `emilys`, password `emilyspass`
(kredensial mana pun dari `dummyjson.com/users` juga berlaku).

---

## Struktur file

```
.
├── login.html          Halaman login
├── index.html          Halaman katalog produk
├── css/style.css       Seluruh style (satu file, pakai CSS variables)
└── js/
    ├── auth.js         Login: validasi API, loading state, simpan sesi
    ├── session.js      Auth guard, sapaan navbar, logout
    ├── format.js       Helper format harga (dipakai bersama)
    ├── products.js     Fetch produk, card grid, load more, modal
    └── cart.js         Search, filter, sorting, keranjang
```

Urutan pemuatan di `index.html` penting: `session.js` harus pertama karena dia
yang memutuskan halaman boleh ditampilkan atau tidak.

---

## Ketentuan Website

### Wajib Native
Tidak ada framework maupun library. Tidak ada satu pun `<link>` atau `<script>`
yang menunjuk ke CDN. Seluruh style ditulis manual di `css/style.css`, seluruh
logika ditulis manual di `js/`.

### External JavaScript + `defer`
Seluruh JavaScript berada di file `.js` terpisah dan dihubungkan dengan atribut
`defer`.

- `login.html` baris 8
- `index.html` baris 10–13

`defer` membuat browser menyelesaikan pembacaan HTML lebih dulu, baru
menjalankan script. Karena itu semua elemen sudah ada di DOM saat kode berjalan,
tanpa perlu membungkusnya dengan `DOMContentLoaded`.

### API
Seluruh data dipanggil dengan `fetch()`:

- Users — `https://dummyjson.com/users?limit=0` → `js/auth.js` baris 3, dipanggil baris 44
- Products — `https://dummyjson.com/products?limit=0` → `js/products.js` baris 4, dipanggil baris 167

`limit=0` membuat dummyjson mengembalikan seluruh data, bukan 30 baris pertama.

---

## 1. Login Page

### 1.1 Form Login
`login.html` baris 20–49 — field `username` dan `password`, dibungkus
`<form id="login-form">`. Atribut `novalidate` dipakai supaya pesan error yang
muncul adalah pesan buatan sendiri, bukan pesan bawaan browser.

### 1.2 Autentikasi API
`js/auth.js` baris 44–58. Data seluruh user diambil dengan `fetch()`, lalu
kredensial dicocokkan dengan `Array.find()`:

```js
const user = data.users.find(
  (u) => u.username === username && u.password === password
);
```

### 1.3 Loading State
`js/auth.js` baris 23–27 (`setLoading`), dipanggil baris 41 dan 67.

Saat proses berjalan: tombol dinonaktifkan (`button.disabled = true`),
teksnya berubah jadi "Memverifikasi...", dan spinner ditampilkan.
Spinner-nya murni CSS — `@keyframes spin` di `css/style.css` baris 142–146 (`.spinner` sendiri di baris 133),
tanpa gambar maupun GIF.

`setLoading(false)` diletakkan di blok `finally`, jadi tombol selalu kembali
normal baik login berhasil maupun gagal.

### 1.4 Error Handling
`js/auth.js` baris 43–68, tiga jenis error ditangani terpisah:

| Kondisi | Pesan |
|---|---|
| Field kosong | "Username dan password wajib diisi." (baris 37) |
| Kredensial salah | "Username atau password salah. Coba lagi." (baris 57) |
| Koneksi/server gagal | "Tidak bisa menghubungi server. Periksa koneksi internetmu." (baris 64) |

Baris 47–49 penting: `fetch()` hanya melempar error kalau jaringannya benar-benar
gagal. Status 404 atau 500 tetap dianggap berhasil, jadi harus dicek manual:

```js
if (!response.ok) {
  throw new Error(`Server menjawab dengan status ${response.status}`);
}
```

Tanpa baris itu, respons error dari server akan lolos ke `response.json()` dan
menghasilkan error yang menyesatkan.

### 1.5 Session Persistence
`js/auth.js` baris 61 — `localStorage.setItem("firstName", user.firstName)`.

### 1.6 Auto Redirect
`js/auth.js` baris 62 — `location.replace("index.html")`.

Dipakai `replace()` dan bukan `href`, karena `replace()` tidak menyimpan halaman
lama di riwayat browser. Efeknya: setelah logout, tombol Back tidak bisa
membawa pengguna kembali ke katalog.

---

## 2. Product Catalog Page (`index.html`)

### 2.1 Proteksi Halaman (Auth Guard)
`js/session.js` baris 4–12 (guard-nya baris 6–12).

```js
if (!firstName) {
  location.replace("login.html");
} else {
  document.getElementById("greeting").textContent = `Hai, ${firstName}!`;
  document.body.hidden = false;
}
```

`<body>` di `index.html` ditulis dengan atribut `hidden` (baris 17), dan hanya
dibuka kalau sesi terbukti ada. Tanpa ini, isi katalog akan berkedip sekilas
sebelum halaman berpindah — redirect saja tidak cukup cepat untuk menutupinya.

### 2.2 Navigation Bar
`index.html` baris 18–46.

- Sapaan nama dari `localStorage.getItem()` → `js/session.js` baris 4 dan 9
- Tombol Logout → `js/session.js` baris 14–17, memakai
  `localStorage.removeItem()` lalu `location.replace("login.html")`

### 2.3 Render Produk Dinamis
`js/products.js` — `cardTemplate()` baris 37–71, `renderGrid()` baris 73–86.

Tiap kartu memuat thumbnail, nama produk, harga, rating, diskon, dan kategori.
Harga diformat oleh `formatPrice()` di `js/format.js`, satu fungsi yang dipakai
bersama oleh kartu produk, modal, dan keranjang supaya formatnya tidak pernah
berbeda antar tampilan.

Data dari API dilewatkan `escapeHTML()` (baris 29–33) sebelum masuk ke
`innerHTML`. Ini mencegah teks dari API diperlakukan sebagai markup — persis
peringatan XSS di modul bagian 2.3.3.

### 2.4 Pencarian Real-Time (Debounce & Closure)
`js/cart.js` — `debounce()` baris 57–63, dipasang baris 77.

```js
function debounce(callback, delay) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
}
```

Di sinilah closure-nya: `timerId` dideklarasikan di dalam `debounce()`, tapi
fungsi yang dikembalikan tetap "mengingat" variabel itu setiap kali dipanggil,
meskipun `debounce()` sendiri sudah selesai dieksekusi. Jadi tiap ketikan baru
bisa membatalkan timer dari ketikan sebelumnya.

Hasilnya: mengetik "laptop" (6 huruf) memicu **satu** kali render, bukan enam.
Jeda yang dipakai 300 ms (`SEARCH_DELAY`, baris 5).

Pencarian menyaring berdasarkan nama **atau** kategori — `js/cart.js` baris 38–44.

### 2.5 Filter & Sorting (Functional Programming)
`js/cart.js` — `applyFilters()` baris 30–52.

Filter kategori dan pencarian ditumpuk dengan `.filter()` berantai, jadi
keduanya berlaku sekaligus, bukan saling menimpa:

```js
const result = products
  .filter((p) => !category || p.category === category)
  .filter((p) => !keyword || p.title.toLowerCase().includes(keyword) || ...);
```

`.filter()` selalu mengembalikan array baru, sehingga `products` yang asli tidak
pernah berubah — inilah alasan filter bisa dihapus lagi tanpa perlu fetch ulang.

Sorting memakai `.sort()` dengan fungsi pembanding yang dipilih dari objek
`sorters` (baris 24–28):

| Pilihan | Pembanding |
|---|---|
| Harga termurah | `(a, b) => a.price - b.price` |
| Harga termahal | `(a, b) => b.price - a.price` |
| Rating tertinggi | `(a, b) => b.rating - a.rating` |

Isi dropdown kategori tidak ditulis manual di HTML, tapi dibangun dari data API
(baris 65–75). `new Set()` dipakai untuk membuang kategori duplikat:

```js
const categories = [...new Set(list.map((p) => p.category))].sort();
```

### 2.6 Keranjang Belanja (Local Storage CRUD)
`js/cart.js` baris 82–219.

Bentuk data yang disimpan adalah objek `{ idProduk: jumlah }`, misalnya
`{ "12": 2, "45": 1 }`. Nama dan harga produk tidak disalin ke dalam keranjang,
melainkan diambil ulang lewat `ProductCatalog.getById()` (baris 105–114). Jadi
kalau harga di API berubah, keranjang tidak menyimpan harga yang basi.

Keempat operasi localStorage yang diminta:

| Operasi | Lokasi | Kapan dipakai |
|---|---|---|
| `getItem` | baris 88 | membaca isi keranjang |
| `setItem` | baris 99 | menambah / mengubah jumlah |
| `removeItem` | baris 97 | otomatis, saat item terakhir dihapus |
| `removeItem` | baris 212 | tombol "Kosongkan keranjang" |

Baris 96–100 adalah bagian yang perlu diperhatikan: kalau keranjang menjadi
kosong, key-nya **dihapus** dari localStorage, bukan disimpan sebagai `{}`.
Bisa diperiksa di DevTools → Application → Local Storage: key `cart` hilang
sepenuhnya.

Pembacaan localStorage dibungkus `try...catch` (baris 87–92) karena isi
localStorage bisa saja rusak atau bukan JSON — kalau itu terjadi, keranjang
dianggap kosong alih-alih membuat seluruh halaman gagal.

Badge jumlah dan total harga dihitung dengan `.reduce()` (baris 121–125):

```js
const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
const total = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
```

Panel keranjang (`index.html` baris 37–43) menampilkan daftar item dengan
tombol `-`, `+`, dan hapus per baris.

### 2.7 Load More / Pagination
`js/products.js` — `renderGrid()` baris 73–86, tombolnya baris 143–146.

Memakai array slicing, 12 produk per batch (`PAGE_SIZE`, baris 5):

```js
const slice = currentList.slice(0, visibleCount);
```

Tombol Load More disembunyikan otomatis saat semua produk sudah tampil
(baris 85). Karena yang dipotong adalah `currentList`, paginasi tetap bekerja
di atas hasil pencarian dan filter, bukan selalu di atas daftar penuh.

### 2.8 Detail Produk Modal (Event Delegation)
`js/products.js` — `modalTemplate()` baris 88–106, listener-nya baris 120–128.

Listener dipasang **satu kali di elemen parent** `#product-grid`, bukan di
setiap kartu:

```js
grid.addEventListener("click", (event) => {
  if (event.target.closest(".add-to-cart-btn")) return;
  const card = event.target.closest(".product-card");
  if (!card) return;
  ...
});
```

Ini memanfaatkan event bubbling: klik pada kartu menggelembung naik ke grid,
lalu `closest()` dipakai untuk mencari kartu mana yang diklik. Keuntungannya,
kartu yang baru dirender setelah search atau Load More langsung bisa diklik
tanpa perlu memasang listener baru.

Baris 121 adalah pembagian tugas antar file: klik pada tombol keranjang
di-`return` lebih awal di sini, supaya ditangani oleh `cart.js` dan tidak
membuka modal secara tidak sengaja.

Tombol "+ Keranjang" juga ditangani dengan event delegation, tapi di level
`document` (`js/cart.js` baris 176–190), karena tombol yang sama muncul di dua
tempat: di kartu produk dan di dalam modal.

Modal bisa ditutup lewat tiga cara: tombol `×`, klik area gelap di luar konten
(baris 131–135), dan tombol Escape (baris 137–139).

### 2.9 Global Error Handling
`js/products.js` — `showError()` baris 150–155, dipanggil dari `catch` baris 185.

Kalau fetch produk gagal, pesan error ditampilkan di `#products-error`, grid
dikosongkan, dan tombol Load More disembunyikan — supaya tidak ada sisa
tampilan yang menyesatkan.

---

## Fitur tambahan (di luar requirement)

Semuanya tetap dalam lingkup HTML, CSS, dan JS murni.

| Fitur | Lokasi |
|---|---|
| Panel keranjang dengan tombol `-`, `+`, hapus per item | `js/cart.js` 192–209 |
| Tutup modal dengan tombol Escape | `js/products.js` 137–139 |
| Tutup modal dengan klik area gelap di luarnya | `js/products.js` 131–135 |
| Tutup panel keranjang dengan klik di luar navbar | `js/cart.js` 221–226 |
| Harga asli sebelum diskon (dicoret) | `js/products.js` 19–22 |
| `escapeHTML()` untuk mencegah XSS dari data API | `js/products.js` 29–33, `js/cart.js` 161–165 |
| Umpan balik "Ditambahkan" di tombol keranjang | `js/cart.js` 183–189 |
| `loading="lazy"` pada gambar produk | `js/products.js` 53 |
| Tema warna lewat CSS variables (ganti 1 baris = seluruh halaman berubah) | `css/style.css` 2–18 |
| `role="alert"` pada kotak error, dibacakan screen reader | `login.html` 18, `index.html` 64 |
| Tampilan responsif sampai lebar layar ponsel | `css/style.css` (Flexbox + Grid) |

---

## Catatan teknis

**Komunikasi antar file.** `products.js` dan `cart.js` tidak saling meng-import.
Keduanya dihubungkan lewat dua jalur:

1. `products.js` memancarkan `CustomEvent` bernama `products:loaded` setelah
   fetch selesai (baris 181–183). `cart.js` menunggunya di baris 231–235 — di
   situlah dropdown kategori diisi dan keranjang dari sesi sebelumnya dihitung.
2. `products.js` menyediakan `window.ProductCatalog` (baris 192–200) dengan
   `getAll()`, `getById()`, dan `setList()`. `cart.js` mengirim hasil filter
   lewat `setList()`, lalu `products.js` yang merender.

Pembagian ini membuat `products.js` tidak perlu tahu apa pun soal keranjang, dan
`cart.js` tidak perlu tahu cara menggambar kartu produk.

**IIFE.** `products.js` dan `cart.js` dibungkus
`(() => { ... })()` supaya variabel di dalamnya tidak bocor ke scope global dan
tidak bertabrakan, meskipun keduanya dimuat di halaman yang sama.

**Kenapa harga dalam USD.** `dummyjson.com` memberikan harga dalam USD dan
ditampilkan apa adanya tanpa konversi, supaya angka di layar sama dengan sumber
datanya dan tidak ada kurs hardcoded yang bisa basi.
