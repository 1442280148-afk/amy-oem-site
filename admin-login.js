const adminLoginClient = window.supabaseClient;
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const loginButton = loginForm.querySelector('button[type="submit"]');

if (!adminLoginClient) {
  loginStatus.textContent = "Supabase client missing. Please check supabase-config.js loading order.";
  loginButton.disabled = true;
} else {
  loginStatus.textContent = "Admin access uses the configured Supabase publishable key.";
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  window.location.href = "admin.html";
});
