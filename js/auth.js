/* auth.js — Halaman login (Ryan / Orang A)
   Tugas file ini: validasi kredensial ke dummyjson, simpan sesi, redirect. */

const USERS_API = "https://dummyjson.com/users?limit=0"; // limit=0 = ambil semua user
const SESSION_KEY = "firstName";

const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorBox = document.getElementById("error-box");
const button = document.getElementById("login-button");
const buttonText = document.getElementById("login-button-text");
const spinner = document.getElementById("login-spinner");

// Sudah login? Tidak perlu lihat halaman login lagi.
if (localStorage.getItem(SESSION_KEY)) {
  location.replace("index.html");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  spinner.hidden = !isLoading;
  buttonText.textContent = isLoading ? "Memverifikasi..." : "Masuk";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError("Username dan password wajib diisi.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(USERS_API);

    // fetch tidak otomatis error saat status 404/500, jadi dicek manual
    if (!response.ok) {
      throw new Error(`Server menjawab dengan status ${response.status}`);
    }

    const data = await response.json();
    const user = data.users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      showError("Username atau password salah. Coba lagi.");
      return;
    }

    localStorage.setItem(SESSION_KEY, user.firstName);
    location.replace("index.html");
  } catch (error) {
    showError("Tidak bisa menghubungi server. Periksa koneksi internetmu.");
    console.error("Login gagal:", error);
  } finally {
    setLoading(false);
  }
});
