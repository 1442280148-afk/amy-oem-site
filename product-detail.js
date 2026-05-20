async function loadRelatedProducts(currentProduct) {
  const container = document.getElementById("relatedProducts");

  if (!container || !currentProduct) return;

  if (!currentProduct.category) {
    container.innerHTML = '<p class="related-products-message">No related products found.</p>';
    return;
  }

  try {
    const config = window.XIQI_CONFIG || window.XIQI_SUPABASE;
    const relatedProductsClient = window.supabaseClient;
    const { data, error } = await relatedProductsClient
      .from(config.productsTable)
      .select("id,name,category,short_desc,description,image_url,status,sort_order,created_at")
      .eq("status", "published")
      .eq("category", currentProduct.category)
      .neq("id", currentProduct.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) throw error;

    renderRelatedProducts(container, data || []);
  } catch (error) {
    console.error("Failed to load related products.", error);
    container.innerHTML = '<p class="related-products-message">Failed to load related products.</p>';
  }
}

function renderRelatedProducts(container, products) {
  if (!products.length) {
    container.innerHTML = '<p class="related-products-message">No related products found.</p>';
    return;
  }

  container.innerHTML = products.map((product) => `
    <a href="product-detail.html?id=${encodeURIComponent(product.id)}" class="related-card">
      <img src="${escapeRelatedAttribute(product.image_url || "logo.png")}" alt="${escapeRelatedAttribute(product.name || "LinfTech Product")}" loading="lazy">
      <h3>${escapeRelatedHtml(product.name || "LinfTech Product")}</h3>
      <p>${escapeRelatedHtml(product.short_desc || product.description || product.category || "")}</p>
    </a>
  `).join("");
}

function escapeRelatedHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRelatedAttribute(value) {
  return escapeRelatedHtml(value).replaceAll("`", "&#096;");
}

