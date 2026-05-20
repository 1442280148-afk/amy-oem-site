document.addEventListener("DOMContentLoaded", () => {
  loadHomeCategories();
  loadHomeFeaturedProducts();
});

async function loadHomeCategories() {
  const grid = document.querySelector("#products .category-grid");

  if (!grid || typeof supabase === "undefined") return;

  try {
    const config = window.XIQI_SUPABASE;
    const homeCategoriesClient = getXiqiSupabaseClient(config);
    const { data, error } = await homeCategoriesClient
      .from("categories")
      .select("id,name,slug,image_url,description,link,status,sort_order,created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    renderCategories(grid, mergeCategoryFallbacks(data || []));
  } catch (error) {
    console.warn("Home categories unavailable, keeping static cards.", error);
  }
}

function renderCategories(container, categories) {
  try {
    if (!Array.isArray(categories) || !categories.length) return;

    const cards = categories
      .map((category, index) => {
        try {
          return renderCategoryCard(category, index);
        } catch (error) {
          console.warn("Skipped invalid category item.", error, category);
          return "";
        }
      })
      .filter(Boolean);

    if (cards.length) {
      container.innerHTML = cards.join("");
      if (typeof setupCategoryCardLinks === "function") setupCategoryCardLinks();
    }
  } catch (error) {
    console.warn("Category render failed, keeping static cards.", error);
  }
}

function renderCategoryCard(category, index = 0) {
  const name = cleanText(category.name) || "Mobile Accessories";
  const slug = cleanText(category.slug) || slugify(name);
  const description = cleanText(category.description) || "Wholesale and OEM sourcing options for global buyers.";
  const link = cleanText(category.link) || `product.html?category=${encodeURIComponent(slug)}`;
  const displayIndex = String(index + 1).padStart(2, "0");
  const visualType = getVisualType(name);

  return `
    <article class="category-card brand-category-card" data-category-link="${escapeAttribute(link)}">
      <div class="category-media category-visual category-visual-${visualType}">
        <div class="visual-device ${getVisualDeviceClass(visualType)}"></div>
      </div>
      <div class="category-info">
        <span class="category-index">${displayIndex}</span>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(description)}</p>
        <a href="${escapeAttribute(link)}" class="product-link">View Products</a>
      </div>
    </article>
  `;
}

async function loadHomeFeaturedProducts() {
  const grid = document.getElementById("homeFeaturedProducts");

  if (!grid || typeof supabase === "undefined") return;

  try {
    const config = window.XIQI_SUPABASE;
    const homeProductsClient = getXiqiSupabaseClient(config);
    const { data, error } = await homeProductsClient
      .from(config.productsTable || "products")
      .select("id,name,category,image_url,short_desc,status,sort_order,created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    renderFeaturedProducts(grid, mergeProductFallbacks(data || []));
  } catch (error) {
    console.warn("Home featured products unavailable, keeping static cards.", error);
  }
}

function renderFeaturedProducts(container, products) {
  if (!Array.isArray(products) || !products.length) return;

  const cards = products
    .map((product) => {
      const name = cleanText(product.name) || "Mobile Accessories Product";
      const category = cleanText(product.category) || "Mobile Accessories";
      const id = cleanText(String(product.id || ""));
      const link = id ? `product-detail.html?id=${encodeURIComponent(id)}` : `product.html?category=${encodeURIComponent(category)}`;
      const visualType = getVisualType(`${category} ${name}`);

      return `
        <article class="home-product-card">
          <div class="product-visual product-visual-${visualType}">
            <div class="visual-device ${getVisualDeviceClass(visualType)}"></div>
          </div>
          <div>
            <span>${escapeHtml(category)}</span>
            <h3>${escapeHtml(name)}</h3>
            <a href="${escapeAttribute(link)}">View Details</a>
          </div>
        </article>
      `;
    })
    .join("");

  if (cards) container.innerHTML = cards;
}

function getCategoryIconClass(name) {
  const normalized = normalizeCategory(name);

  if (normalized.includes("case")) return "phone-icon";
  if (normalized.includes("film") || normalized.includes("screen")) return "film-icon";
  if (normalized.includes("charger")) return "charger-icon";
  if (normalized.includes("earbud") || normalized.includes("audio")) return "earbuds-icon";
  if (normalized.includes("power")) return "power-icon";

  return "accessory-icon";
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getXiqiSupabaseClient(config) {
  return window.supabaseClient;
}


function getFallbackCategoryImage(name) {
  const normalized = normalizeCategory(name);

  if (normalized.includes("case")) return "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=85";
  if (normalized.includes("film") || normalized.includes("screen")) return "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1000&q=85";
  if (normalized.includes("charger")) return "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=85";
  if (normalized.includes("earbud") || normalized.includes("audio")) return "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1000&q=85";
  if (normalized.includes("power")) return "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1000&q=85";

  return "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=85";
}

const fallbackHomeCategories = [
  { name: "Phone Cases", slug: "Phone Cases", description: "Protective, magnetic, clear, fashion and custom phone case options.", image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1000&q=85" },
  { name: "Hydrogel Films", slug: "Hydrogel Films", description: "Flexible hydrogel films, privacy films and screen protection supplies.", image_url: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1000&q=85" },
  { name: "Chargers", slug: "Chargers", description: "Wall chargers, wireless charging and fast charging accessories.", image_url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=85" },
  { name: "Earbuds", slug: "Earbuds", description: "Wireless audio products for retail, wholesale and brand projects.", image_url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1000&q=85" },
  { name: "Power Banks", slug: "Power Banks", description: "Portable charging solutions with different capacity and design choices.", image_url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1000&q=85" },
  { name: "Other Accessories", slug: "Other Accessories", description: "Cables, holders, packaging and coordinated accessory sourcing.", image_url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=85" }
];

const fallbackHomeProducts = [
  { name: "Premium Phone Cases", category: "Phone Cases", image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80" },
  { name: "Hydrogel Screen Protection", category: "Hydrogel Films", image_url: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=900&q=80" },
  { name: "Fast Charging Adapters", category: "Chargers", image_url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80" },
  { name: "Wireless Earbuds", category: "Earbuds", image_url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80" },
  { name: "Portable Power Banks", category: "Power Banks", image_url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80" },
  { name: "Charging Cables", category: "Other Accessories", image_url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80" },
  { name: "Mobile Accessories Sets", category: "Other Accessories", image_url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80" },
  { name: "Custom Branding Options", category: "OEM", image_url: "https://images.unsplash.com/photo-1601972602237-8c79241e468b?auto=format&fit=crop&w=900&q=80" }
];

function mergeCategoryFallbacks(categories) {
  const merged = Array.isArray(categories) ? categories.slice(0, 6) : [];
  const existing = new Set(merged.map((item) => normalizeCategory(item.name || item.slug)));

  fallbackHomeCategories.forEach((item) => {
    if (merged.length >= 6) return;
    if (existing.has(normalizeCategory(item.name))) return;
    merged.push(item);
  });

  return merged;
}

function mergeProductFallbacks(products) {
  const merged = Array.isArray(products) ? products.slice(0, 8) : [];
  const existing = new Set(merged.map((item) => normalizeCategory(item.name)));

  fallbackHomeProducts.forEach((item) => {
    if (merged.length >= 8) return;
    if (existing.has(normalizeCategory(item.name))) return;
    merged.push(item);
  });

  return merged;
}

function getVisualType(value) {
  const normalized = normalizeCategory(value);

  if (normalized.includes("case") || normalized.includes("cover")) return "case";
  if (normalized.includes("film") || normalized.includes("screen") || normalized.includes("protector")) return "film";
  if (normalized.includes("charger") || normalized.includes("adapter")) return "charger";
  if (normalized.includes("earbud") || normalized.includes("audio") || normalized.includes("headphone")) return "earbuds";
  if (normalized.includes("power") || normalized.includes("bank")) return "power";
  if (normalized.includes("cable") || normalized.includes("accessor")) return "accessory";

  return "accessory";
}

function getVisualDeviceClass(type) {
  const map = {
    case: "case-visual",
    film: "film-visual",
    charger: "charger-visual",
    earbuds: "earbuds-visual",
    power: "powerbank-visual",
    accessory: "cable-visual"
  };

  return map[type] || map.accessory;
}


