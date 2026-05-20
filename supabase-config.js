(function () {
  const runtimeEnv = window.XIQI_ENV || window.__XIQI_ENV__ || {};
  const nodeEnv = typeof process !== "undefined" && process.env ? process.env : {};

  const url = runtimeEnv.VITE_SUPABASE_URL || runtimeEnv.SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || nodeEnv.SUPABASE_URL || "";
  const key = runtimeEnv.VITE_SUPABASE_ANON_KEY || runtimeEnv.SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.SUPABASE_ANON_KEY || "";
  const productsTable = runtimeEnv.SUPABASE_PRODUCTS_TABLE || nodeEnv.SUPABASE_PRODUCTS_TABLE || "products";
  const storageBucket = runtimeEnv.SUPABASE_STORAGE_BUCKET || nodeEnv.SUPABASE_STORAGE_BUCKET || "product-images";

  window.XIQI_CONFIG = {
    url,
    key,
    productsTable,
    storageBucket
  };

  window.XIQI_SUPABASE = window.XIQI_CONFIG;
}());
