window.SUPABASE_URL = "https://tkbhfsmydyojyttsrxcb.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_BLMyP5GWgLrALrj9ZODDzg_uDIF6BV_";

window.supabaseClient = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

window.XIQI_CONFIG = {
  url: window.SUPABASE_URL,
  key: window.SUPABASE_ANON_KEY,
  productsTable: "products",
  storageBucket: "product-images"
};

window.XIQI_SUPABASE = window.XIQI_CONFIG;
