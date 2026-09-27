/* helper harga, dipakai bersama oleh products.js dan cart.js */

function formatPrice(usd) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}
