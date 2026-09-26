/* session.js — Auth guard + navbar untuk index.html (Ryan / Orang A)
   Dimuat paling awal di index.html, sebelum products.js dan cart.js. */

const SESSION_KEY = "firstName";
const firstName = localStorage.getItem(SESSION_KEY);

if (!firstName) {
  // Belum login: paksa balik ke halaman login, isi halaman tidak pernah tampil.
  location.replace("login.html");
} else {
  document.getElementById("greeting").textContent = `Hai, ${firstName}!`;
  document.body.hidden = false;
}

document.getElementById("logout-button").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  location.replace("login.html");
});
