window.XIQI_ADMIN_READY = new Promise((resolve, reject) => {
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.supabaseClient) {
      const message = "Supabase client missing. Please check supabase-config.js loading order.";
      showAdminAuthError(message);
      reject(new Error(message));
      return;
    }

    document.body.classList.add("admin-authenticated");
    bindLogout();
    resolve({ mode: "public-admin" });
  });
});

function bindLogout() {
  const logoutButton = document.getElementById("logoutButton");

  if (!logoutButton) return;

  logoutButton.addEventListener("click", () => {
    window.location.href = "admin-login.html";
  });
}

function showAdminAuthError(message) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("afterbegin", `<div style="padding:16px;color:#b91c1c;background:#fee2e2;font-weight:700">${message}</div>`);
  });
}
