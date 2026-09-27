/* search debounce, filter kategori, sorting, keranjang localStorage */

(() => {
  const CART_KEY = "cart";
  const SEARCH_DELAY = 300;

  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  const cartButton = document.getElementById("cart-button");
  const cartBadge = document.getElementById("cart-badge");
  const cartTotal = document.getElementById("cart-total");
  const cartPanel = document.getElementById("cart-panel");
  const cartItems = document.getElementById("cart-items");
  const cartClear = document.getElementById("cart-clear");

  let products = [];

  // =========================================================
  // 1. SEARCH + FILTER + SORTING
  // =========================================================

  const sorters = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "rating-desc": (a, b) => b.rating - a.rating,
  };

  function applyFilters() {
    if (products.length === 0) return; // produk belum selesai di-fetch

    const keyword = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;

    // filter mengembalikan array baru, jadi products asli tidak pernah berubah
    const result = products
      .filter((p) => !category || p.category === category)
      .filter(
        (p) =>
          !keyword ||
          p.title.toLowerCase().includes(keyword) ||
          p.category.toLowerCase().includes(keyword)
      );

    const sorter = sorters[sortSelect.value];
    if (sorter) result.sort(sorter);

    window.ProductCatalog.setList(result);
  }

  /* Debounce pakai closure.
     timerId hidup di dalam debounce(), tapi fungsi yang dikembalikan tetap
     "mengingat" variabel itu setiap kali dipanggil. Jadi setiap ketikan baru
     membatalkan timer ketikan sebelumnya — filter cuma jalan sekali,
     setelah user berhenti mengetik. */
  function debounce(callback, delay) {
    let timerId;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => callback(...args), delay);
    };
  }

  function fillCategories(list) {
    // Set membuang kategori duplikat, lalu diubah balik jadi array dan diurutkan
    const categories = [...new Set(list.map((p) => p.category))].sort();

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      categorySelect.appendChild(option);
    });
  }

  searchInput.addEventListener("input", debounce(applyFilters, SEARCH_DELAY));
  categorySelect.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

  // =========================================================
  // 2. KERANJANG (localStorage CRUD)
  //    Bentuk data: { "12": 2, "45": 1 }  ->  { id produk: jumlah }
  // =========================================================

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
      // Isi localStorage rusak / bukan JSON -> anggap keranjang kosong
      return {};
    }
  }

  function writeCart(cart) {
    if (Object.keys(cart).length === 0) {
      localStorage.removeItem(CART_KEY);
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
    renderCart();
  }

  // Gabungkan isi keranjang dengan data produk supaya dapat nama & harga
  function cartRows() {
    const cart = readCart();

    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = window.ProductCatalog.getById(id);
        return product ? { product, quantity } : null;
      })
      .filter(Boolean);
  }

  function renderCart() {
    const cart = readCart();
    const rows = cartRows();

    // reduce meringkas seluruh isi keranjang jadi satu angka
    const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const total = rows.reduce(
      (sum, row) => sum + row.product.price * row.quantity,
      0
    );

    cartBadge.textContent = count;
    cartTotal.textContent = count > 0 ? formatPrice(total) : "";

    if (rows.length === 0) {
      cartItems.innerHTML = `<p class="cart-empty">Keranjang masih kosong.</p>`;
      cartClear.hidden = true;
      return;
    }

    cartClear.hidden = false;
    cartItems.innerHTML = rows
      .map(
        ({ product, quantity }) => `
        <div class="cart-row">
          <img class="cart-row-thumb" src="${product.thumbnail}" alt="" />
          <div class="cart-row-info">
            <span class="cart-row-title">${escapeHTML(product.title)}</span>
            <span class="cart-row-price">
              ${formatPrice(product.price)} x ${quantity} =
              <strong>${formatPrice(product.price * quantity)}</strong>
            </span>
          </div>
          <div class="cart-row-actions">
            <button type="button" class="qty-btn" data-action="decrease" data-id="${product.id}">-</button>
            <span class="qty-value">${quantity}</span>
            <button type="button" class="qty-btn" data-action="increase" data-id="${product.id}">+</button>
            <button type="button" class="qty-btn remove-btn" data-action="remove" data-id="${product.id}">&times;</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function addToCart(id) {
    const cart = readCart();
    cart[id] = (cart[id] || 0) + 1;
    writeCart(cart);
  }

  // Event delegation: satu listener di document menangani tombol "+ Keranjang"
  // di kartu produk MAUPUN di dalam modal detail, termasuk kartu yang baru
  // dirender setelah search/filter.
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-cart-btn");
    if (!button) return;

    addToCart(button.dataset.id);

    const originalText = button.textContent;
    button.textContent = "Ditambahkan";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 800);
  });

  // Event delegation kedua: tombol -, +, dan hapus di dalam panel keranjang
  cartItems.addEventListener("click", (event) => {
    const button = event.target.closest(".qty-btn");
    if (!button) return;

    const cart = readCart();
    const id = button.dataset.id;

    if (button.dataset.action === "increase") {
      cart[id] += 1;
    } else if (button.dataset.action === "decrease") {
      cart[id] -= 1;
      if (cart[id] <= 0) delete cart[id];
    } else {
      delete cart[id];
    }

    writeCart(cart);
  });

  cartClear.addEventListener("click", () => {
    localStorage.removeItem(CART_KEY);
    renderCart();
  });

  cartButton.addEventListener("click", () => {
    cartPanel.hidden = !cartPanel.hidden;
  });

  // Tutup panel kalau klik di luar navbar
  document.addEventListener("click", (event) => {
    if (cartPanel.hidden) return;
    if (event.target.closest(".navbar-right")) return;
    cartPanel.hidden = true;
  });

  // =========================================================
  // 3. Menunggu produk selesai di-fetch oleh products.js
  // =========================================================

  document.addEventListener("products:loaded", (event) => {
    products = event.detail.products;
    fillCategories(products);
    renderCart(); // keranjang dari sesi sebelumnya baru bisa dihitung sekarang
  });

  renderCart();
})();
