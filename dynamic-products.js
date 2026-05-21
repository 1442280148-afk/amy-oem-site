document.addEventListener("DOMContentLoaded", () => {
  loadProductGrid();
  loadProductDetail();
});

const config = window.XIQI_SUPABASE;
const dynamicProductsClient = window.supabaseClient;
const defaultFilterCategories = [
  "Phone Cases",
  "Chargers",
  "Screen Protectors",
  "Power Banks",
  "Earbuds",
  "Data Cables"
];
const productGridState = {
  products: [],
  activeCategory: "All Products",
  searchTerm: ""
};

async function loadProductGrid() {
  const grid = document.querySelector(".product-grid");

  if (!grid) return;

  try {
    const products = await fetchProducts();

    if (!products.length) return;

    productGridState.products = products;
    await loadFilterCategories();
    setupProductFilters();
    applyInitialCategoryFilter();
    renderFilteredProducts();
  } catch (error) {
    console.log("Product API unavailable, using static products.", error);
  }
}

async function loadFilterCategories() {
  const filterButtons = document.querySelector(".product-filter-buttons");

  if (!filterButtons) return;

  try {
    const { data, error } = await dynamicProductsClient
      .from("categories")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderFilterCategories(data || []);
  } catch (error) {
    console.log("Category filters unavailable, using default filters.", error);
    renderFilterCategories(defaultFilterCategories.map((name, index) => ({
      name,
      slug: slugify(name),
      sort_order: index
    })));
  }
}

function renderFilterCategories(categories) {
  const filterButtons = document.querySelector(".product-filter-buttons");

  if (!filterButtons) return;

  const visibleCategories = categories
    .filter((category) => normalizeCategory(category.name || category.slug))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  filterButtons.innerHTML = `
    <button type="button" class="product-filter-btn is-active" data-category="All Products">All Products</button>
    ${visibleCategories.map((category) => {
      const label = category.name || category.slug;
      const value = category.slug || label;

      return `<button type="button" class="product-filter-btn" data-category="${escapeAttribute(value)}">${escapeHtml(label)}</button>`;
    }).join("")}
  `;
}

function setupProductFilters() {
  const filterButtons = document.querySelectorAll(".product-filter-btn");
  const searchInput = document.getElementById("productSearchInput");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      productGridState.activeCategory = button.dataset.category || "All Products";
      updateActiveFilterButton();
      renderFilteredProducts();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      productGridState.searchTerm = searchInput.value.trim().toLowerCase();
      renderFilteredProducts();
    });
  }
}

function applyInitialCategoryFilter() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");

  if (!category) return;

  const matchedButton = [...document.querySelectorAll(".product-filter-btn")].find((button) => {
    return normalizeCategory(button.dataset.category) === normalizeCategory(category);
  });

  productGridState.activeCategory = matchedButton ? matchedButton.dataset.category : category;
  updateActiveFilterButton();
}

function updateActiveFilterButton() {
  document.querySelectorAll(".product-filter-btn").forEach((button) => {
    const isActive = normalizeCategory(button.dataset.category) === normalizeCategory(productGridState.activeCategory);
    button.classList.toggle("is-active", isActive);
  });
}

function renderFilteredProducts() {
  const grid = document.querySelector(".product-grid");

  if (!grid) return;

  const filteredProducts = productGridState.products.filter((product) => {
    const matchesCategory = productGridState.activeCategory === "All Products" ||
      normalizeCategory(product.category) === normalizeCategory(productGridState.activeCategory);
    const matchesSearch = !productGridState.searchTerm || getProductSearchText(product).includes(productGridState.searchTerm);

    return matchesCategory && matchesSearch;
  });

  if (!filteredProducts.length) {
    grid.innerHTML = `
      <div class="product-empty-state">
        <h3>No products found</h3>
        <p>Try another category or search keyword.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map((product) => `
    <div class="product-card">
      <img src="${escapeAttribute(product.image_url || "")}" alt="${escapeAttribute(product.name || "LinfTech Product")}" loading="lazy">
      <div class="product-info">
        <span class="product-category-chip">${escapeHtml(product.category || "Wholesale Accessories")}</span>
        <h3>${escapeHtml(product.name || "LinfTech Product")}</h3>
        <p>${escapeHtml(product.short_desc || "Factory direct mobile accessories with OEM / ODM wholesale support.")}</p>
        ${renderProductSpecs(product)}
        <a href="product-detail.html?id=${encodeURIComponent(product.id)}">View Details</a>
        <a class="whatsapp-mini-cta" href="${escapeAttribute(buildWhatsappLink(product.name || "LinfTech Product"))}" target="_blank" rel="noopener">Quick OEM Quote</a>
      </div>
    </div>
  `).join("");
}

function buildWhatsappLink(productName) {
  const message = `Hello, I’m interested in ${productName}.\nPlease send me catalog and quotation.`;
  return `https://wa.me/8617817004592?text=${encodeURIComponent(message)}`;
}

function renderProductSpecs(product) {
  const specs = getProductSpecs(product);

  return `
    <div class="product-specs" aria-label="Wholesale product details">
      ${specs.map((item) => `
        <span class="product-spec">
          <strong>${escapeHtml(item.label)}</strong>
          ${escapeHtml(item.value)}
        </span>
      `).join("")}
    </div>
    <div class="product-badges" aria-label="OEM and packaging support">
      <span>OEM Logo Support</span>
      <span>Packaging Available</span>
    </div>
  `;
}

function getProductSpecs(product) {
  return [
    { label: "MOQ", value: product.moq || "Low MOQ" },
    { label: "Material", value: product.material || inferMaterial(product) },
    { label: "Lead Time", value: product.lead_time || product.leadTime || "5-12 Days" }
  ];
}

function inferMaterial(product) {
  const text = `${product.name || ""} ${product.category || ""}`.toLowerCase();

  if (text.includes("case") || text.includes("cover")) return "TPU / PC / Leather";
  if (text.includes("film") || text.includes("screen")) return "Hydrogel / Tempered Glass";
  if (text.includes("charger") || text.includes("cable")) return "ABS / Copper";
  if (text.includes("earbud") || text.includes("audio")) return "ABS / Silicone";
  if (text.includes("power")) return "ABS / Battery Cell";

  return "Custom Material";
}

function getProductSearchText(product) {
  return [
    product.name,
    product.short_desc,
    product.description,
    product.category
  ].filter(Boolean).join(" ").toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadProductDetail() {
  const detailPage = document.querySelector(".detail-page");

  if (!detailPage) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  try {
    const { data, error } = await dynamicProductsClient
      .from(config.productsTable)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    renderProductDetail(data);
  } catch (error) {
    console.log("Supabase product detail unavailable, using static detail.", error);
  }
}

async function fetchProducts() {
  const { data, error } = await dynamicProductsClient
    .from(config.productsTable)
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

function renderProductDetail(product) {
  const mainImage = document.querySelector(".detail-main-image img");
  const gallery = document.querySelector(".detail-gallery");
  const tag = document.querySelector(".detail-tag");
  const title = document.querySelector(".detail-right h1");
  const desc = document.querySelector(".detail-desc");
  const features = document.querySelector(".detail-features");
  const info = document.querySelector(".detail-info");
  const videoSection = document.querySelector(".product-video-section");
  const productVideo = document.getElementById("productVideo");
  const inquiryButton = document.querySelector(".detail-buttons .btn.primary");
  const whatsappButton = document.querySelector(".detail-buttons .btn.secondary");
  const ogTitle = `${product.name || "Product Details"} | LinfTech`;
  const ogDescription = product.short_desc || product.description || "LinfTech OEM and wholesale mobile accessories product details.";
  const images = buildGalleryImages(product);

  if (mainImage && images.length) {
    mainImage.src = images[0];
    updateMeta("property", "og:image", images[0]);
  }

  if (gallery && images.length) {
    gallery.innerHTML = images.map((image) => `
      <img src="${escapeAttribute(image)}" alt="">
    `).join("");
    setupGalleryControls(images);
  }

  if (tag) {
    tag.textContent = product.category || "MOBILE ACCESSORIES";
  }

  if (title) {
    title.textContent = product.name || "LinfTech Product";
  }

  if (desc) {
    desc.textContent = product.description || product.short_desc || "OEM / wholesale mobile accessories product from LinfTech.";
  }

  if (features) {
    const items = parseFeatures(product.features);

    if (items.length) {
      features.innerHTML = items.map((item) => `
        <div class="feature-item">${escapeHtml(item)}</div>
      `).join("");
    }
  }

  if (info) {
    const rows = [
      ["Price", product.price || "Contact for price"],
      ["MOQ", product.moq],
      ["Material", product.material],
      ["Packaging", product.packaging],
      ["Lead Time", product.lead_time]
    ].filter((row) => row[1]);

    if (rows.length) {
      info.innerHTML = rows.map(([label, value]) => `
        <div class="info-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("");
    }
  }

  if (videoSection && productVideo && product.video_url) {
    productVideo.src = product.video_url;
    videoSection.hidden = false;
    productVideo.load();
    productVideo.play().catch(() => {});
  } else if (videoSection && productVideo) {
    productVideo.removeAttribute("src");
    videoSection.hidden = true;
  }

  if (inquiryButton) {
    inquiryButton.href = `index.html?product=${encodeURIComponent(product.name || "LinfTech Product")}#contact`;
  }

  if (whatsappButton) {
    whatsappButton.href = buildWhatsappLink(product.name || "LinfTech Product");
    whatsappButton.target = "_blank";
    whatsappButton.rel = "noopener";
  }

  if (typeof loadRelatedProducts === "function") {
    loadRelatedProducts(product);
  }

  document.title = ogTitle;
  updateMeta("name", "description", ogDescription);
  updateMeta("property", "og:title", ogTitle);
  updateMeta("property", "og:description", ogDescription);
}

function buildGalleryImages(product) {
  const images = [product.image_url]
    .concat(normalizeGallery(product.gallery))
    .filter(Boolean);

  return [...new Set(images)];
}

function normalizeGallery(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function setupGalleryControls(images) {
  const mainImage = document.querySelector(".detail-main-image img");
  const gallery = document.querySelector(".detail-gallery");

  if (!mainImage || !gallery) return;

  let activeIndex = 0;
  let touchStartX = 0;

  gallery.querySelectorAll("img").forEach((image, index) => {
    image.addEventListener("click", () => showGalleryImage(index));
  });

  mainImage.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  mainImage.addEventListener("touchend", (event) => {
    const diff = event.changedTouches[0].clientX - touchStartX;

    if (Math.abs(diff) < 40) return;

    if (diff < 0) showGalleryImage(activeIndex + 1);
    if (diff > 0) showGalleryImage(activeIndex - 1);
  }, { passive: true });

  function showGalleryImage(index) {
    activeIndex = (index + images.length) % images.length;
    mainImage.classList.remove("is-swapping");
    void mainImage.offsetWidth;
    mainImage.src = images[activeIndex];
    mainImage.classList.add("is-swapping");
  }
}

function parseFeatures(value) {
  if (!value) return [];

  return String(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateMeta(attribute, key, content) {
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function normalizeCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/s\b/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

