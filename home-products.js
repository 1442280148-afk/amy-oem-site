document.addEventListener("DOMContentLoaded", () => {
  loadHomeCategories();
  loadFactoryVideo();
});

async function loadHomeCategories() {
  const grid = document.querySelector("#products .category-grid");

  if (!grid) return;

  try {
    const config = window.XIQI_SUPABASE;
    const client = supabase.createClient(config.url, config.key);
    const { data, error } = await client
      .from("categories")
      .select("id,name,slug,image_url,description,link,status,sort_order,created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) throw error;

    renderCategories(grid, data || []);
  } catch (error) {
    console.warn("Home categories unavailable, keeping static cards.", error);
  }
}

function renderCategories(container, categories) {
  try {
    if (!Array.isArray(categories) || !categories.length) {
      return;
    }

    const cards = categories
      .map((category) => {
        try {
          return renderCategoryCard(category);
        } catch (error) {
          console.warn("Skipped invalid category item.", error, category);
          return "";
        }
      })
      .filter(Boolean);

    if (!cards.length) {
      return;
    }

    container.innerHTML = cards.join("");
  } catch (error) {
    console.warn("Category render failed, keeping static cards.", error);
  }
}

function renderCategoryCard(category) {
  const name = cleanText(category.name) || "XiQi Category";
  const slug = cleanText(category.slug) || slugify(name);
  const imageUrl = cleanText(category.image_url) || "logo.png";
  const description = cleanText(category.description);
  const link = cleanText(category.link) || `product.html?category=${encodeURIComponent(slug)}`;

  return `
    <div class="category-card">
      <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(name)}" loading="lazy">
      <div class="category-info">
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(description)}</p>
        <a href="${escapeAttribute(link)}" class="product-link">
          View Details
        </a>
      </div>
    </div>
  `;
}

async function loadFactoryVideo() {
  const video = document.querySelector(".about-left video");

  if (!video) return;

  try {
    const config = window.XIQI_SUPABASE;
    const client = supabase.createClient(config.url, config.key);
    const { data, error } = await client
      .from("factory_media")
      .select("title,description,video_url,status,sort_order,created_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.video_url) return;

    renderFactoryVideo(video, data);
  } catch (error) {
    console.warn("Factory video unavailable, keeping static video.", error);
  }
}

function renderFactoryVideo(video, media) {
  try {
    const videoUrl = cleanText(media.video_url);

    if (!videoUrl) return;

    const source = video.querySelector("source");

    if (source) {
      source.src = videoUrl;
      source.type = "video/mp4";
    } else {
      video.src = videoUrl;
    }

    video.preload = "metadata";
    video.load();
    video.play().catch(() => {});
  } catch (error) {
    console.warn("Factory video render failed, keeping static video.", error);
  }
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
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
