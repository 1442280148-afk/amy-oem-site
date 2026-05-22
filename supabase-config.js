window.SUPABASE_URL = "https://tkbhfsmydyojyttsrxcb.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_BLMyP5GWgLrALrj9ZODDzg_uDIF6BV_";

if (window.supabase?.createClient) {
  window.supabaseClient = supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
} else {
  window.supabaseClient = null;
  console.error("Supabase SDK failed to load before supabase-config.js.");
}

window.XIQI_CONFIG = {
  url: window.SUPABASE_URL,
  key: window.SUPABASE_ANON_KEY,
  productsTable: "products",
  storageBucket: "products"
};

window.XIQI_SUPABASE = window.XIQI_CONFIG;
