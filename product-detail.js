async function loadRelatedProducts(currentProduct) {
  const container = document.getElementById("relatedProducts");

  if (!container || !currentProduct) return;

  if (!currentProduct.category) {
    container.innerHTML = '<p class="related-products-message">No related products found.</p>';
    return;
  }

  try {
    const config = window.XIQI_CONFIG || window.XIQI_SUPABASE;
    const client = window.supabaseClient;
    const { data, error } = await client
      .from(config.productsTable)
      .select("id,title,name,category,short_desc,description,images,image_url,status,sort_order,created_at")
      .eq("status", "published")
      .eq("category", currentProduct.category)
      .neq("id", currentProduct.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) throw error;

    renderRelatedProducts(container, data || []);
  } catch (error) {
    console.warn("Failed to load related products.", error);
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
      <img src="${escapeRelatedAttribute(getRelatedProductImage(product))}" alt="${escapeRelatedAttribute(product.title || product.name || "LinfTech Product")}" loading="lazy">
      <h3>${escapeRelatedHtml(product.title || product.name || "LinfTech Product")}</h3>
      <p>${escapeRelatedHtml(product.short_desc || product.description || product.category || "")}</p>
    </a>
  `).join("");
}

function getRelatedProductImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.find(Boolean) || product.image_url || "logo.png";
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


