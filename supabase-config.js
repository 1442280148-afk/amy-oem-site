window.SUPABASE_URL = "https://tkbhfsmydyojyttsrxcb.supabase.co";
window.SUPABASE_ANON_KEY = "PASTE_NEW_SUPABASE_PUBLISHABLE_KEY_HERE";

if (window.supabase?.createClient) {
  window.supabaseClient = supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
} else {
  window.supabaseClient = null;
  console.error("Supabase SDK failed to load before supabase-config.js.");
}

window.XIQI_CONFIG = {
  url: window.SUPABASE_URL,
  key: window.SUPABASE_ANON_KEY,
  productsTable: "products",
  storageBucket: "product-images"
};

window.XIQI_SUPABASE = window.XIQI_CONFIG;
