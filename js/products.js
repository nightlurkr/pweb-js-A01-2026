/* fetch produk, render card grid, load more, modal detail */

(() => {
  const PRODUCTS_API = "https://dummyjson.com/products?limit=0"; // limit=0 = ambil semua
  const PAGE_SIZE = 12;

  const grid = document.getElementById("product-grid");
  const errorBox = document.getElementById("products-error");
  const loadMoreButton = document.getElementById("load-more");
  const modal = document.getElementById("product-modal");
  const modalContent = document.getElementById("modal-content");

  let allProducts = []; // hasil mentah dari API
  let currentList = []; // daftar yang sedang ditampilkan (bisa hasil filter Orang C)
  let visibleCount = 0;

  // ---------- Util ----------

  function originalPrice(product) {
    if (!product.discountPercentage) return product.price;
    return product.price / (1 - product.discountPercentage / 100);
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  // Cegah HTML asing dari data API dianggap markup (title/brand/description dll.)
  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  // ---------- Render kartu produk ----------

  function cardTemplate(product) {
    const hasDiscount = product.discountPercentage > 0;
    const discountBadge = hasDiscount
      ? `<span class="badge-discount">-${Math.round(product.discountPercentage)}%</span>`
      : "";
    const oldPriceHTML = hasDiscount
      ? `<span class="price-old">${formatPrice(originalPrice(product))}</span>`
      : "";

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-thumb-wrap">
          <img
            class="product-thumb"
            src="${product.thumbnail}"
            alt="${escapeHTML(product.title)}"
            loading="lazy"
          />
          ${discountBadge}
        </div>
        <div class="product-body">
          <span class="product-category">${escapeHTML(capitalize(product.category))}</span>
          <h3 class="product-title">${escapeHTML(product.title)}</h3>
          <div class="product-rating">⭐ ${product.rating.toFixed(1)}</div>
          <div class="product-price-row">
            <span class="price-current">${formatPrice(product.price)}</span>
            ${oldPriceHTML}
          </div>
          <button type="button" class="add-to-cart-btn" data-id="${product.id}">
            + Keranjang
          </button>
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const slice = currentList.slice(0, visibleCount);

    if (slice.length === 0) {
      grid.innerHTML = `<p class="empty-state">Tidak ada produk yang cocok.</p>`;
      loadMoreButton.hidden = true;
      return;
    }

    grid.innerHTML = slice.map(cardTemplate).join("");
    loadMoreButton.hidden = visibleCount >= currentList.length;
  }

  // ---------- Modal detail produk ----------

  function modalTemplate(product) {
    const hasDiscount = product.discountPercentage > 0;

    return `
      <button type="button" class="modal-close" aria-label="Tutup">&times;</button>
      <img class="modal-image" src="${product.thumbnail}" alt="${escapeHTML(product.title)}" />
      <h2 class="modal-title">${escapeHTML(product.title)}</h2>
      <p class="modal-brand">${escapeHTML(product.brand || "-")} · ${escapeHTML(capitalize(product.category))}</p>
      <p class="modal-price">
        ${formatPrice(product.price)}
        ${hasDiscount ? `<span class="price-old">${formatPrice(originalPrice(product))}</span>` : ""}
      </p>
      <p class="modal-rating">⭐ ${product.rating.toFixed(1)} · Stok: ${product.stock}</p>
      <p class="modal-description">${escapeHTML(product.description)}</p>
      <button type="button" class="add-to-cart-btn modal-add-btn" data-id="${product.id}">
        + Tambah ke Keranjang
      </button>
    `;
  }

  function openModal(product) {
    modalContent.innerHTML = modalTemplate(product);
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalContent.innerHTML = "";
  }

  // Event delegation di grid: klik kartu -> buka modal.
  // Klik tombol tambah-keranjang di-skip di sini, biar cart.js yang urus.
  grid.addEventListener("click", (event) => {
    if (event.target.closest(".add-to-cart-btn")) return;

    const card = event.target.closest(".product-card");
    if (!card) return;

    const product = allProducts.find((p) => String(p.id) === card.dataset.id);
    if (product) openModal(product);
  });

  // Event delegation di modal: tombol close ATAU klik area backdrop (di luar konten)
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest(".modal-close")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  // ---------- Load More (array slicing) ----------

  loadMoreButton.addEventListener("click", () => {
    visibleCount = Math.min(visibleCount + PAGE_SIZE, currentList.length);
    renderGrid();
  });

  // ---------- Error handling global ----------

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    grid.innerHTML = "";
    loadMoreButton.hidden = true;
  }

  function clearError() {
    errorBox.hidden = true;
  }

  // ---------- Fetch produk ----------

  async function fetchProducts() {
    grid.innerHTML = `<p class="loading-state">Memuat produk...</p>`;

    try {
      const response = await fetch(PRODUCTS_API);

      if (!response.ok) {
        throw new Error(`Server menjawab dengan status ${response.status}`);
      }

      const data = await response.json();
      allProducts = data.products;
      currentList = allProducts;
      visibleCount = Math.min(PAGE_SIZE, currentList.length);

      clearError();
      renderGrid();

      document.dispatchEvent(
        new CustomEvent("products:loaded", { detail: { products: allProducts } })
      );
    } catch (error) {
      showError("Gagal memuat produk. Periksa koneksi internetmu lalu refresh halaman.");
      console.error("Fetch produk gagal:", error);
    }
  }

  // ---------- API untuk cart.js / search & filter (Orang C) ----------

  window.ProductCatalog = {
    getAll: () => allProducts,
    getById: (id) => allProducts.find((p) => String(p.id) === String(id)),
    setList: (list) => {
      currentList = list;
      visibleCount = Math.min(PAGE_SIZE, currentList.length);
      renderGrid();
    },
  };

  fetchProducts();
})();