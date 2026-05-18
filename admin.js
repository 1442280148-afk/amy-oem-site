const config = window.XIQI_CONFIG;
const client = window.XIQI_ADMIN_CLIENT;

if (!config) {
  showBlockingAdminError("XIQI_CONFIG missing. Please check supabase-config.js loading order.");
  throw new Error("XIQI_CONFIG missing. Please check supabase-config.js loading order.");
}

if (!client) {
  showBlockingAdminError("Authenticated Supabase client missing. Please check admin-auth.js loading order.");
  throw new Error("Authenticated Supabase client missing. Please check admin-auth.js loading order.");
}

const form = document.getElementById("productForm");
const statusText = document.getElementById("formStatus");
const productList = document.getElementById("productList");
const refreshButton = document.getElementById("refreshProducts");
const inquiryList = document.getElementById("inquiryList");
const refreshInquiriesButton = document.getElementById("refreshInquiries");
const categoryForm = document.getElementById("categoryForm");
const categoryList = document.getElementById("categoryList");
const refreshCategoriesButton = document.getElementById("refreshCategories");
const cancelCategoryEditButton = document.getElementById("cancelCategoryEdit");
const categoryStatus = document.getElementById("categoryStatus");
const categorySubmitButton = categoryForm.querySelector('button[type="submit"]');
const factoryForm = document.getElementById("factoryForm");
const factoryVideoList = document.getElementById("factoryVideoList");
const refreshFactoryVideosButton = document.getElementById("refreshFactoryVideos");
const cancelFactoryEditButton = document.getElementById("cancelFactoryEdit");
const factoryStatus = document.getElementById("factoryStatus");
const factorySubmitButton = factoryForm.querySelector('button[type="submit"]');
const productGalleryList = document.getElementById("productGalleryList");
const removeProductVideoButton = document.getElementById("removeProductVideo");
const productVideoStatus = document.getElementById("productVideoStatus");
const cancelEditButton = document.getElementById("cancelEdit");
const submitButton = form.querySelector('button[type="submit"]');
const dashboardStats = document.getElementById("dashboardStats");
const recentProducts = document.getElementById("recentProducts");
const recentInquiries = document.getElementById("recentInquiries");
const refreshDashboardButton = document.getElementById("refreshDashboard");
const toast = document.getElementById("adminToast");

let adminSession = null;
let productsCache = [];
let categoriesCache = [];
let factoryVideosCache = [];
let inquiriesCache = [];
let categorySlugTouched = false;
let toastTimer = null;

setupTabs();
setupCategorySlugSuggestion();
setupRefreshDashboard();

async function ensureAdminSession() {
  if (!client) {
    window.location.href = "admin-login.html";
    throw new Error("Authenticated Supabase client is not available.");
  }

  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error || !session) {
    window.location.href = "admin-login.html";
    throw new Error("Admin login required.");
  }

  adminSession = session;
  window.XIQI_ADMIN_SESSION = session;

  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  console.log("Supabase admin role:", getJwtRole(session.access_token), session.user?.email || "unknown");

  return adminSession;
}

async function initAdmin() {
  try {
    await ensureAdminSession();
    await loadAllAdminData();
  } catch (error) {
    console.warn(error.message || "Admin session unavailable.");
  }
}

async function loadAllAdminData() {
  await Promise.all([
    loadProducts(),
    loadCategories(),
    loadFactoryVideos(),
    loadInquiries()
  ]);
  renderDashboard();
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-admin-tab]"));
  const panels = Array.from(document.querySelectorAll(".admin-tab-panel"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.adminTab));
  });

  if (tabs.length && panels.length) activateTab("dashboardTab");
}

function activateTab(targetId) {
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.adminTab === targetId);
  });
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
}

function setupRefreshDashboard() {
  if (!refreshDashboardButton) return;

  refreshDashboardButton.addEventListener("click", async () => {
    setButtonBusy(refreshDashboardButton, true);
    try {
      await loadAllAdminData();
      showToast("Dashboard refreshed.");
    } catch (error) {
      showToast(error.message || "Failed to refresh dashboard.", "error");
    } finally {
      setButtonBusy(refreshDashboardButton, false);
    }
  });
}

function setupCategorySlugSuggestion() {
  const nameInput = categoryForm?.elements?.name;
  const slugInput = categoryForm?.elements?.slug;

  if (!nameInput || !slugInput) return;

  slugInput.addEventListener("input", () => {
    categorySlugTouched = true;
  });

  nameInput.addEventListener("input", () => {
    if (categorySlugTouched && slugInput.value.trim()) return;
    slugInput.value = slugify(nameInput.value);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  setBusy(true);
  setStatus("Saving product...");

  try {
    await ensureAdminSession();
    const formData = new FormData(form);
    const id = formData.get("id");
    const imageUrl = await resolveImageUrl(formData);
    const videoUrl = await resolveProductVideoUrl(formData);
    const gallery = await resolveGalleryUrls(formData);
    const savedProduct = await saveProduct(formData, imageUrl, videoUrl, gallery);
    await saveOptionalProductFields(savedProduct, formData);
    resetForm();
    const message = id ? "Product updated successfully." : "Product saved successfully.";
    setStatus(message);
    showToast(message);
    await loadProducts();
  } catch (error) {
    const message = error.message || "Failed to save product.";
    setStatus(message);
    showToast(message, "error");
  } finally {
    setBusy(false);
  }
});

refreshButton.addEventListener("click", async () => {
  setButtonBusy(refreshButton, true);
  try {
    await loadProducts();
    showToast("Products refreshed.");
  } catch (error) {
    showToast(error.message || "Failed to refresh products.", "error");
  } finally {
    setButtonBusy(refreshButton, false);
  }
});

refreshInquiriesButton.addEventListener("click", async () => {
  setButtonBusy(refreshInquiriesButton, true);
  try {
    await loadInquiries();
    showToast("Inquiries refreshed.");
  } catch (error) {
    showToast(error.message || "Failed to refresh inquiries.", "error");
  } finally {
    setButtonBusy(refreshInquiriesButton, false);
  }
});

cancelEditButton.addEventListener("click", resetForm);

refreshCategoriesButton.addEventListener("click", async () => {
  setButtonBusy(refreshCategoriesButton, true);
  try {
    await loadCategories();
    showToast("Categories refreshed.");
  } catch (error) {
    showToast(error.message || "Failed to refresh categories.", "error");
  } finally {
    setButtonBusy(refreshCategoriesButton, false);
  }
});

cancelCategoryEditButton.addEventListener("click", resetCategoryForm);

refreshFactoryVideosButton.addEventListener("click", async () => {
  setButtonBusy(refreshFactoryVideosButton, true);
  try {
    await loadFactoryVideos();
    showToast("Factory videos refreshed.");
  } catch (error) {
    showToast(error.message || "Failed to refresh videos.", "error");
  } finally {
    setButtonBusy(refreshFactoryVideosButton, false);
  }
});

cancelFactoryEditButton.addEventListener("click", resetFactoryForm);

removeProductVideoButton.addEventListener("click", () => {
  form.current_video_url.value = "";
  form.remove_product_video.value = "1";
  removeProductVideoButton.hidden = true;
  productVideoStatus.textContent = "Product video will be removed after saving.";
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (categorySubmitButton.disabled) return;
  setButtonBusy(categorySubmitButton, true);
  categoryStatus.textContent = "Saving category...";

  try {
    await ensureAdminSession();
    const formData = new FormData(categoryForm);
    const id = formData.get("id");
    const imageUrl = await resolveCategoryImageUrl(formData);
    await saveCategory(formData, imageUrl);
    resetCategoryForm();
    const message = id ? "Category updated." : "Category saved successfully.";
    categoryStatus.textContent = message;
    showToast(message);
    await loadCategories();
  } catch (error) {
    const message = error.message || "Failed to save category.";
    categoryStatus.textContent = message;
    showToast(message, "error");
  } finally {
    setButtonBusy(categorySubmitButton, false);
  }
});

factoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (factorySubmitButton.disabled) return;
  setButtonBusy(factorySubmitButton, true);
  factoryStatus.textContent = "Saving video...";

  try {
    await ensureAdminSession();
    const formData = new FormData(factoryForm);
    const id = formData.get("id");
    const videoUrl = await resolveFactoryVideoUrl(formData);
    await saveFactoryVideo(formData, videoUrl);
    resetFactoryForm();
    const message = id ? "Video updated." : "Video saved successfully.";
    factoryStatus.textContent = message;
    showToast(message);
    await loadFactoryVideos();
  } catch (error) {
    const message = error.message || "Failed to save video.";
    factoryStatus.textContent = message;
    showToast(message, "error");
  } finally {
    setButtonBusy(factorySubmitButton, false);
  }
});
async function resolveImageUrl(formData) {
  const fileInput = document.getElementById("imageFile");
  const file = fileInput.files[0];
  const currentImageUrl = formData.get("current_image_url");

  if (!file) {
    if (currentImageUrl) return currentImageUrl;
    throw new Error("Please choose a product image.");
  }

  return uploadImage(file);
}

async function uploadImage(file) {
  await ensureAdminSession();
  const config = getAdminConfig();
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || "";
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await client.storage.from(config.storageBucket).upload(filename, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message || "Image upload failed.");
  const { data } = client.storage.from(config.storageBucket).getPublicUrl(filename);
  return data.publicUrl;
}

async function uploadFile(file, bucket, folder) {
  await ensureAdminSession();
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || "";
  const filename = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await client.storage.from(bucket).upload(filename, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message || "File upload failed.");
  const { data } = client.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

async function resolveProductVideoUrl(formData) {
  const config = getAdminConfig();
  const file = document.getElementById("productVideoFile").files[0];

  if (formData.get("remove_product_video") === "1") return "";
  if (!file) return formData.get("current_video_url") || "";
  return uploadFile(file, config.storageBucket, "product-videos");
}

async function saveProduct(formData, imageUrl, videoUrl, gallery) {
  await ensureAdminSession();
  const config = getAdminConfig();
  const id = formData.get("id");
  const payload = {
    name: clean(formData.get("name")),
    category: clean(formData.get("category")),
    short_desc: clean(formData.get("short_desc")),
    description: clean(formData.get("description")),
    image_url: imageUrl,
    price: clean(formData.get("price")),
    moq: clean(formData.get("moq")),
    material: clean(formData.get("material")),
    packaging: clean(formData.get("packaging")),
    lead_time: clean(formData.get("lead_time")),
    features: clean(formData.get("features")),
    gallery,
    video_url: videoUrl,
    status: clean(formData.get("status")) || "published",
    sort_order: Number(formData.get("sort_order") || 0)
  };

  if (!payload.name) throw new Error("Product name is required.");

  if (id) {
    const { data, error } = await client.from(config.productsTable).update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await client.from(config.productsTable).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

async function saveOptionalProductFields(savedProduct, formData) {
  if (!savedProduct?.id) return;

  const optionalPayload = {};
  const optionalMap = {
    meta_title: clean(formData.get("meta_title")),
    meta_description: clean(formData.get("meta_description")),
    keywords: clean(formData.get("keywords"))
  };

  Object.entries(optionalMap).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(savedProduct, key)) optionalPayload[key] = value;
  });

  const isFeatured = formData.get("is_featured") === "on";
  if (Object.prototype.hasOwnProperty.call(savedProduct, "is_featured")) {
    optionalPayload.is_featured = isFeatured;
  } else if (Object.prototype.hasOwnProperty.call(savedProduct, "featured")) {
    optionalPayload.featured = isFeatured;
  }

  if (!Object.keys(optionalPayload).length) return;

  const config = getAdminConfig();
  const { error } = await client.from(config.productsTable).update(optionalPayload).eq("id", savedProduct.id);
  if (error) console.warn("Optional product fields were not saved:", error.message || error);
}

async function resolveGalleryUrls(formData) {
  const config = getAdminConfig();
  const files = Array.from(document.getElementById("galleryFiles").files || []);
  const currentGallery = parseGallery(formData.get("current_gallery"));
  if (!files.length) return currentGallery;

  for (let index = 0; index < files.length; index += 1) {
    const imageUrl = await uploadFile(files[index], config.storageBucket, "product-gallery");
    currentGallery.push(imageUrl);
  }

  return currentGallery;
}

async function loadProducts() {
  await ensureAdminSession();
  const config = getAdminConfig();
  productList.innerHTML = renderLoadingState("Loading products...");

  try {
    const { data, error } = await client
      .from(config.productsTable)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    productsCache = data || [];
    renderProducts(productsCache);
    renderDashboard();
  } catch (error) {
    productList.innerHTML = renderEmptyState(error.message || "Failed to load products.");
    showToast(error.message || "Failed to load products.", "error");
  }
}

function renderProducts(products) {
  if (!products.length) {
    productList.innerHTML = renderEmptyState("No products yet", "Add your first product to start building the storefront catalog.");
    return;
  }

  productList.innerHTML = products.map((product) => `
    <article class="admin-product">
      ${renderMediaThumb(product.image_url, product.name || "Product", "product")}
      <div class="admin-product-info">
        <h3>${escapeHtml(product.name || "Untitled Product")}</h3>
        <div class="admin-product-meta">
          <span class="status-pill ${escapeAttribute(normalizeStatusClass(product.status))}">${escapeHtml(product.status || "published")}</span>
          <span class="meta-chip">${escapeHtml(product.category || "Uncategorized")}</span>
          <span class="meta-chip">Price: ${escapeHtml(product.price || "-")}</span>
          <span class="meta-chip">MOQ: ${escapeHtml(product.moq || "-")}</span>
          <span class="meta-chip">Sort: ${escapeHtml(product.sort_order ?? 0)}</span>
          ${isProductFeatured(product) ? '<span class="meta-chip">Featured</span>' : ""}
        </div>
        <p>${escapeHtml(product.short_desc || product.description || "No product summary yet.")}</p>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(product.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(product.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  productList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => String(item.id) === String(button.dataset.id));
      if (button.dataset.action === "edit") editProduct(product);
      if (button.dataset.action === "delete") deleteProduct(product);
    });
  });
}

function editProduct(product) {
  if (!product) return;

  form.id.value = product.id || "";
  form.current_image_url.value = product.image_url || "";
  form.current_video_url.value = product.video_url || product.product_video || "";
  form.current_gallery.value = JSON.stringify(normalizeGallery(product.gallery));
  form.remove_product_video.value = "";
  form.name.value = product.name || "";
  form.category.value = product.category || "";
  form.sort_order.value = product.sort_order || 0;
  form.status.value = product.status || "published";
  form.price.value = product.price || "";
  form.moq.value = product.moq || "";
  form.material.value = product.material || "";
  form.packaging.value = product.packaging || "";
  form.lead_time.value = product.lead_time || "";
  form.short_desc.value = product.short_desc || "";
  form.description.value = product.description || "";
  form.features.value = product.features || "";
  if (form.meta_title) form.meta_title.value = product.meta_title || "";
  if (form.meta_description) form.meta_description.value = product.meta_description || "";
  if (form.keywords) form.keywords.value = product.keywords || "";
  if (form.is_featured) form.is_featured.checked = isProductFeatured(product);
  removeProductVideoButton.hidden = !(product.video_url || product.product_video);
  productVideoStatus.textContent = (product.video_url || product.product_video) ? "Product video attached." : "";
  submitButton.textContent = "Update Product";
  cancelEditButton.hidden = false;
  setStatus("Editing product.");
  renderProductGallery(normalizeGallery(product.gallery));
  activateTab("productsTab");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteProduct(product) {
  await ensureAdminSession();
  const config = getAdminConfig();
  if (!product) return;
  const confirmed = window.confirm(`Delete ${product.name || "this product"}?`);
  if (!confirmed) return;

  setStatus("Deleting product...");
  try {
    await deleteProductStorageFiles(product);
    const { error } = await client.from(config.productsTable).delete().eq("id", product.id);
    if (error) throw error;
    setStatus("Product deleted.");
    showToast("Product deleted.");
    await loadProducts();
  } catch (error) {
    const message = error.message || "Failed to delete product.";
    setStatus(message);
    showToast(message, "error");
  }
}

async function deleteProductStorageFiles(product) {
  const config = getAdminConfig();
  const urls = [product.image_url, ...normalizeGallery(product.gallery), product.video_url].filter(Boolean);
  const paths = [...new Set(urls.map((url) => storagePathFromPublicUrl(url)).filter(Boolean))];
  if (!paths.length) return;
  const { error } = await client.storage.from(config.storageBucket).remove(paths);
  if (error) console.log("Storage cleanup failed:", error);
}

function storagePathFromPublicUrl(url) {
  const config = getAdminConfig();
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${config.storageBucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return "";
  }
}
function renderProductGallery(images) {
  if (!images.length) {
    productGalleryList.innerHTML = renderEmptyState("No gallery images yet", "Upload extra product angles or detail shots.");
    return;
  }

  productGalleryList.innerHTML = images.map((image, index) => `
    <article class="gallery-manage-item">
      <img src="${escapeAttribute(image)}" alt="">
      <input type="number" value="${index + 1}" data-action="sort" data-index="${index}">
      <button type="button" data-action="main" data-url="${escapeAttribute(image)}">Set Main</button>
      <button type="button" data-action="delete" data-index="${index}">Delete</button>
    </article>
  `).join("");

  productGalleryList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => updateGallerySort(input.dataset.index, input.value));
  });

  productGalleryList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "main") setMainProductImage(button.dataset.url);
      if (button.dataset.action === "delete") deleteGalleryImage(button.dataset.index);
    });
  });
}

function updateGallerySort(index, sortOrder) {
  const gallery = parseGallery(form.current_gallery.value);
  const [item] = gallery.splice(Number(index), 1);
  const target = Math.max(0, Math.min(gallery.length, Number(sortOrder || 1) - 1));
  gallery.splice(target, 0, item);
  form.current_gallery.value = JSON.stringify(gallery);
  renderProductGallery(gallery);
}

async function setMainProductImage(imageUrl) {
  await ensureAdminSession();
  const config = getAdminConfig();
  const productId = form.id.value;
  if (!productId) return;

  const { error } = await client.from(config.productsTable).update({ image_url: imageUrl }).eq("id", productId);
  if (error) {
    showToast(error.message || "Failed to set main image.", "error");
    return;
  }

  form.current_image_url.value = imageUrl;
  setStatus("Main image updated.");
  showToast("Main image updated.");
  await loadProducts();
}

function deleteGalleryImage(index) {
  const confirmed = window.confirm("Delete this gallery image?");
  if (!confirmed) return;
  const gallery = parseGallery(form.current_gallery.value);
  gallery.splice(Number(index), 1);
  form.current_gallery.value = JSON.stringify(gallery);
  renderProductGallery(gallery);
  showToast("Gallery image removed from this product draft.");
}

async function resolveCategoryImageUrl(formData) {
  const config = getAdminConfig();
  const file = document.getElementById("categoryImageFile").files[0];
  const currentImageUrl = formData.get("current_image_url");
  if (!file) return currentImageUrl || "";
  return uploadFile(file, config.storageBucket, "categories");
}

async function saveCategory(formData, imageUrl) {
  await ensureAdminSession();
  const id = formData.get("id");
  const name = clean(formData.get("name"));
  const slug = clean(formData.get("slug")) || slugify(name);
  const link = clean(formData.get("link")) || `product.html?category=${encodeURIComponent(slug || name)}`;
  const payload = {
    name,
    slug,
    image_url: imageUrl,
    description: clean(formData.get("description")),
    link,
    sort_order: Number(formData.get("sort_order") || 0),
    status: clean(formData.get("status")) || "published"
  };

  if (!payload.name) throw new Error("Category name is required.");

  if (id) {
    const { error } = await client.from("categories").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("categories").insert([payload]);
  if (error) throw error;
}

async function loadCategories() {
  await ensureAdminSession();
  categoryList.innerHTML = renderLoadingState("Loading categories...");

  try {
    const { data, error } = await client
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    categoriesCache = data || [];
    renderCategories(categoriesCache);
    renderDashboard();
  } catch (error) {
    categoryList.innerHTML = renderEmptyState(error.message || "Failed to load categories.");
    showToast(error.message || "Failed to load categories.", "error");
  }
}

function renderCategories(categories) {
  if (!categories.length) {
    categoryList.innerHTML = renderEmptyState("No categories yet", "Create product categories for a cleaner buyer experience.");
    return;
  }

  categoryList.innerHTML = categories.map((category) => `
    <article class="admin-product">
      ${renderMediaThumb(category.image_url, category.name || "Category", "category")}
      <div class="admin-product-info">
        <h3>${escapeHtml(category.name || "Untitled Category")}</h3>
        <div class="admin-product-meta">
          <span class="status-pill ${escapeAttribute(normalizeStatusClass(category.status))}">${escapeHtml(category.status || "hidden")}</span>
          <span class="meta-chip">Slug: ${escapeHtml(category.slug || "-")}</span>
          <span class="meta-chip">Sort: ${escapeHtml(category.sort_order ?? 0)}</span>
        </div>
        <p>${escapeHtml(category.description || category.link || "No category description yet.")}</p>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(category.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(category.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  categoryList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const category = categories.find((item) => String(item.id) === String(button.dataset.id));
      if (button.dataset.action === "edit") editCategory(category);
      if (button.dataset.action === "delete") deleteCategory(category);
    });
  });
}

function editCategory(category) {
  if (!category) return;
  categorySlugTouched = true;
  categoryForm.id.value = category.id || "";
  categoryForm.current_image_url.value = category.image_url || "";
  categoryForm.name.value = category.name || "";
  categoryForm.slug.value = category.slug || slugify(category.name || "");
  categoryForm.description.value = category.description || "";
  categoryForm.link.value = category.link || "";
  categoryForm.sort_order.value = category.sort_order || 0;
  categoryForm.status.value = category.status === "draft" ? "hidden" : category.status || "published";
  categorySubmitButton.textContent = "Update Category";
  cancelCategoryEditButton.hidden = false;
  categoryStatus.textContent = "Editing category.";
  activateTab("categoriesTab");
  categoryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteCategory(category) {
  await ensureAdminSession();
  if (!category) return;
  const confirmed = window.confirm(`Delete ${category.name || "this category"}?`);
  if (!confirmed) return;

  try {
    const { error } = await client.from("categories").delete().eq("id", category.id);
    if (error) throw error;
    categoryStatus.textContent = "Category deleted.";
    showToast("Category deleted.");
    await loadCategories();
  } catch (error) {
    const message = error.message || "Failed to delete category.";
    categoryStatus.textContent = message;
    showToast(message, "error");
  }
}

function resetCategoryForm() {
  categoryForm.reset();
  categoryForm.id.value = "";
  categoryForm.current_image_url.value = "";
  categorySubmitButton.textContent = "Add Category";
  cancelCategoryEditButton.hidden = true;
  categorySlugTouched = false;
}

async function resolveFactoryVideoUrl(formData) {
  const session = await ensureAdminSession();
  console.log("Authenticated factory video user:", session.user?.email || "unknown");
  const file = document.getElementById("factoryVideoFile").files[0];
  const currentVideoUrl = formData.get("current_video_url");
  if (!file) {
    if (currentVideoUrl) return currentVideoUrl;
    throw new Error("Please choose an MP4 video.");
  }
  return uploadFile(file, "factory-videos", "homepage");
}

async function saveFactoryVideo(formData, videoUrl) {
  const session = await ensureAdminSession();
  console.log("Authenticated factory media user:", session.user?.email || "unknown");
  const id = formData.get("id");
  const payload = {
    title: clean(formData.get("title")),
    description: clean(formData.get("description")),
    video_url: videoUrl,
    sort_order: Number(formData.get("sort_order") || 0),
    status: clean(formData.get("status")) || "published"
  };

  if (!payload.title) throw new Error("Video title is required.");

  if (id) {
    const { error } = await client.from("factory_media").update(payload).eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("factory_media").insert([payload]);
  if (error) throw error;
}

async function loadFactoryVideos() {
  await ensureAdminSession();
  factoryVideoList.innerHTML = renderLoadingState("Loading videos...");

  try {
    const { data, error } = await client
      .from("factory_media")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    factoryVideosCache = data || [];
    renderFactoryVideos(factoryVideosCache);
  } catch (error) {
    factoryVideoList.innerHTML = renderEmptyState(error.message || "Failed to load videos.");
    showToast(error.message || "Failed to load videos.", "error");
  }
}
function renderFactoryVideos(videos) {
  if (!videos.length) {
    factoryVideoList.innerHTML = renderEmptyState("No videos uploaded", "Upload MP4 media when you want to feature production or product clips.");
    return;
  }

  factoryVideoList.innerHTML = videos.map((video) => `
    <article class="admin-product">
      <video class="admin-video-preview" src="${escapeAttribute(video.video_url || "")}" muted playsinline></video>
      <div class="admin-product-info">
        <h3>${escapeHtml(video.title || "Untitled Video")}</h3>
        <div class="admin-product-meta">
          <span class="status-pill ${escapeAttribute(normalizeStatusClass(video.status))}">${escapeHtml(video.status || "draft")}</span>
          <span class="meta-chip">Sort: ${escapeHtml(video.sort_order ?? 0)}</span>
        </div>
        <p>${escapeHtml(video.description || "No video description yet.")}</p>
      </div>
      <div class="admin-product-actions">
        <button type="button" data-action="edit" data-id="${escapeAttribute(video.id)}">Edit</button>
        <button type="button" data-action="delete" data-id="${escapeAttribute(video.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  factoryVideoList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const video = videos.find((item) => String(item.id) === String(button.dataset.id));
      if (button.dataset.action === "edit") editFactoryVideo(video);
      if (button.dataset.action === "delete") deleteFactoryVideo(video);
    });
  });
}

function editFactoryVideo(video) {
  if (!video) return;
  factoryForm.id.value = video.id || "";
  factoryForm.current_video_url.value = video.video_url || "";
  factoryForm.title.value = video.title || "";
  factoryForm.description.value = video.description || "";
  factoryForm.sort_order.value = video.sort_order || 0;
  factoryForm.status.value = video.status || "published";
  factorySubmitButton.textContent = "Update Video";
  cancelFactoryEditButton.hidden = false;
  factoryStatus.textContent = "Editing video.";
  activateTab("factoryTab");
  factoryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteFactoryVideo(video) {
  await ensureAdminSession();
  if (!video) return;
  const confirmed = window.confirm(`Delete ${video.title || "this video"}?`);
  if (!confirmed) return;

  try {
    const { error } = await client.from("factory_media").delete().eq("id", video.id);
    if (error) throw error;
    factoryStatus.textContent = "Video deleted.";
    showToast("Video deleted.");
    await loadFactoryVideos();
  } catch (error) {
    const message = error.message || "Failed to delete video.";
    factoryStatus.textContent = message;
    showToast(message, "error");
  }
}

function resetFactoryForm() {
  factoryForm.reset();
  factoryForm.id.value = "";
  factoryForm.current_video_url.value = "";
  factorySubmitButton.textContent = "Add Video";
  cancelFactoryEditButton.hidden = true;
}

async function loadInquiries() {
  await ensureAdminSession();
  inquiryList.innerHTML = renderLoadingState("Loading inquiries...");

  try {
    const { data, error } = await client
      .from("inquiries")
      .select("id,name,email,whatsapp,product,message,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    inquiriesCache = data || [];
    renderInquiries(inquiriesCache);
    renderDashboard();
  } catch (error) {
    inquiryList.innerHTML = renderEmptyState(error.message || "Failed to load inquiries.");
    showToast(error.message || "Failed to load inquiries.", "error");
  }
}

function renderInquiries(inquiries) {
  if (!inquiries.length) {
    inquiryList.innerHTML = renderEmptyState("No inquiries yet", "New buyer inquiries will appear here as lead cards.");
    return;
  }

  inquiryList.innerHTML = inquiries.map((inquiry) => {
    const whatsappUrl = buildWhatsAppLink(inquiry.whatsapp);
    return `
      <article class="admin-inquiry" data-inquiry-id="${escapeAttribute(inquiry.id)}">
        <div>
          <div class="inquiry-head">
            <div>
              <h3>${escapeHtml(inquiry.name || "Unnamed Customer")}</h3>
              <p>${escapeHtml(inquiry.email || "No email provided")}</p>
            </div>
            <select class="inquiry-status-select ${escapeAttribute(normalizeInquiryStatus(inquiry.status))}" data-action="status" data-id="${escapeAttribute(inquiry.id)}">
              ${renderStatusOptions(inquiry.status)}
            </select>
          </div>
          <div class="inquiry-meta">
            <p><strong>Email:</strong> ${escapeHtml(inquiry.email || "-")}</p>
            <p><strong>WhatsApp:</strong> ${escapeHtml(inquiry.whatsapp || "-")}</p>
            <p><strong>Interested Product:</strong> ${escapeHtml(inquiry.product || "-")}</p>
            <p><strong>Submitted:</strong> ${escapeHtml(formatDate(inquiry.created_at))}</p>
          </div>
          <div class="inquiry-detail" hidden>
            <div class="inquiry-detail-grid">
              <div class="detail-block">
                <strong>Customer Info</strong>
                <p>${escapeHtml(inquiry.name || "-")}<br>${escapeHtml(inquiry.email || "-")}<br>${escapeHtml(inquiry.whatsapp || "-")}</p>
              </div>
              <div class="detail-block">
                <strong>Interested Product</strong>
                <p>${escapeHtml(inquiry.product || "-")}<br>${escapeHtml(formatDate(inquiry.created_at))}</p>
              </div>
            </div>
            <div class="detail-block">
              <strong>Inquiry Message</strong>
              <p class="inquiry-message">${escapeHtml(inquiry.message || "No message provided.")}</p>
            </div>
            <div class="detail-block">
              <strong>Quick Reply Template</strong>
              <p class="quick-reply">Thank you for your inquiry. Could you please share your target quantity, destination country, and preferred product specifications? We will prepare a quotation for you shortly.</p>
            </div>
          </div>
        </div>
        <div class="inquiry-actions">
          ${whatsappUrl ? `<a class="wa-link" href="${escapeAttribute(whatsappUrl)}" target="_blank" rel="noopener">Open WhatsApp</a>` : ""}
          <button type="button" data-action="view" data-id="${escapeAttribute(inquiry.id)}">View Details</button>
          <button type="button" data-action="delete" data-id="${escapeAttribute(inquiry.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  inquiryList.querySelectorAll('button[data-action="view"]').forEach((button) => {
    button.addEventListener("click", () => toggleInquiryDetail(button));
  });

  inquiryList.querySelectorAll('button[data-action="delete"]').forEach((button) => {
    button.addEventListener("click", () => {
      const inquiry = inquiries.find((item) => String(item.id) === String(button.dataset.id));
      deleteInquiry(inquiry);
    });
  });

  inquiryList.querySelectorAll(".inquiry-status-select").forEach((select) => {
    select.addEventListener("change", () => updateInquiryStatus(select.dataset.id, select.value));
  });
}

function renderStatusOptions(status) {
  const current = normalizeInquiryStatus(status);
  const statuses = ["new", "replied", "quoted", "closed"];
  return statuses.map((item) => `
    <option value="${item}" ${item === current ? "selected" : ""}>${capitalize(item)}</option>
  `).join("");
}

function normalizeInquiryStatus(status) {
  const value = String(status || "new").toLowerCase();
  return ["new", "replied", "quoted", "closed"].includes(value) ? value : "new";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toggleInquiryDetail(button) {
  const card = button.closest(".admin-inquiry");
  const detail = card?.querySelector(".inquiry-detail");
  if (!detail) return;
  detail.hidden = !detail.hidden;
  button.textContent = detail.hidden ? "View Details" : "Hide Details";
}

async function updateInquiryStatus(id, status) {
  await ensureAdminSession();
  const normalizedStatus = normalizeInquiryStatus(status);
  const { error } = await client.from("inquiries").update({ status: normalizedStatus }).eq("id", id);

  if (error) {
    showToast(error.message || "Failed to update inquiry status.", "error");
    await loadInquiries();
    return;
  }

  inquiriesCache = inquiriesCache.map((inquiry) => (
    String(inquiry.id) === String(id) ? { ...inquiry, status: normalizedStatus } : inquiry
  ));
  renderDashboard();
  showToast("Inquiry status updated.");
}

async function deleteInquiry(inquiry) {
  await ensureAdminSession();
  if (!inquiry) return;
  const confirmed = window.confirm(`Delete inquiry from ${inquiry.name || "this customer"}?`);
  if (!confirmed) return;

  try {
    const { error } = await client.from("inquiries").delete().eq("id", inquiry.id);
    if (error) throw error;
    showToast("Inquiry deleted.");
    await loadInquiries();
  } catch (error) {
    showToast(error.message || "Failed to delete inquiry.", "error");
  }
}

function renderDashboard() {
  if (!dashboardStats || !recentProducts || !recentInquiries) return;

  const publishedProducts = productsCache.filter((product) => normalizeStatusClass(product.status) === "published").length;
  const newInquiries = inquiriesCache.filter((inquiry) => normalizeInquiryStatus(inquiry.status) === "new").length;

  dashboardStats.innerHTML = [
    { label: "Total Products", value: productsCache.length, hint: "All product records" },
    { label: "Published Products", value: publishedProducts, hint: "Visible storefront items" },
    { label: "Categories", value: categoriesCache.length, hint: "Active collection structure" },
    { label: "New Inquiries", value: newInquiries, hint: "Leads awaiting response" }
  ].map((item) => `
    <article class="stat-card">
      <p>${escapeHtml(item.label)}</p>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.hint)}</span>
    </article>
  `).join("");

  recentProducts.innerHTML = productsCache.length
    ? productsCache.slice(0, 5).map((product) => `
      <article class="compact-item">
        ${renderCompactThumb(product.image_url, product.name || "Product")}
        <div>
          <h3>${escapeHtml(product.name || "Untitled Product")}</h3>
          <p>${escapeHtml(product.category || "Uncategorized")} · ${escapeHtml(product.status || "published")}</p>
        </div>
        <span class="meta-chip">${escapeHtml(product.sort_order ?? 0)}</span>
      </article>
    `).join("")
    : renderEmptyState("No products yet", "Recent products will appear after you add catalog items.");

  recentInquiries.innerHTML = inquiriesCache.length
    ? inquiriesCache.slice(0, 5).map((inquiry) => `
      <article class="compact-item">
        <div class="compact-thumb">${escapeHtml(getInitials(inquiry.name || inquiry.email || "Lead"))}</div>
        <div>
          <h3>${escapeHtml(inquiry.name || "Unnamed Customer")}</h3>
          <p>${escapeHtml(inquiry.product || inquiry.email || "No product specified")}</p>
        </div>
        <span class="status-pill ${escapeAttribute(normalizeInquiryStatus(inquiry.status))}">${escapeHtml(normalizeInquiryStatus(inquiry.status))}</span>
      </article>
    `).join("")
    : renderEmptyState("No inquiries yet", "New buyer leads will appear here.");
}
function buildWhatsAppLink(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  const text = "Hello, thank you for your inquiry. Could you please share your target quantity and destination country?";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function renderMediaThumb(url, alt, type) {
  if (url) return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}">`;
  const className = type === "category" ? "category-thumb-placeholder" : "product-thumb-placeholder";
  return `<div class="${className}">${escapeHtml(type === "category" ? "Category" : "Product")}</div>`;
}

function renderCompactThumb(url, alt) {
  if (url) return `<img class="compact-thumb" src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}">`;
  return `<div class="compact-thumb">${escapeHtml(getInitials(alt))}</div>`;
}

function renderLoadingState(message) {
  return `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
}

function renderEmptyState(title, description = "") {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    </div>
  `;
}

function normalizeStatusClass(status) {
  const value = String(status || "published").toLowerCase();
  if (["draft", "hidden"].includes(value)) return value;
  return "published";
}

function isProductFeatured(product) {
  return Boolean(product?.is_featured ?? product?.featured ?? false);
}

function getInitials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("") || "--";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function resetForm() {
  form.reset();
  form.id.value = "";
  form.current_image_url.value = "";
  form.current_video_url.value = "";
  form.current_gallery.value = "";
  form.remove_product_video.value = "";
  if (form.meta_title) form.meta_title.value = "";
  if (form.meta_description) form.meta_description.value = "";
  if (form.keywords) form.keywords.value = "";
  if (form.is_featured) form.is_featured.checked = false;
  productGalleryList.innerHTML = "";
  productVideoStatus.textContent = "";
  removeProductVideoButton.hidden = true;
  submitButton.textContent = "Add Product";
  cancelEditButton.hidden = true;
}

function setBusy(isBusy) {
  setButtonBusy(submitButton, isBusy);
}

function setButtonBusy(button, isBusy) {
  if (!button) return;
  button.disabled = isBusy;
  button.classList.toggle("is-loading", isBusy);
}

function showToast(message, type = "success") {
  if (!toast || !message) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("is-error", type === "error");
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseGallery(value) {
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

function normalizeGallery(value) {
  return parseGallery(value);
}

function setStatus(message) {
  statusText.textContent = message;
}

function getAdminConfig() {
  const config = window.XIQI_CONFIG;
  if (!config) throw new Error("XIQI_CONFIG missing. Please check supabase-config.js loading order.");
  return config;
}

function showBlockingAdminError(message) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("afterbegin", `<div style="padding:16px;color:#fecaca;background:#7f1d1d;font-weight:700">${message}</div>`);
  });
}

function getJwtRole(accessToken) {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.role || "unknown";
  } catch {
    return "unknown";
  }
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

window.XIQI_ADMIN_READY
  .then(() => initAdmin())
  .catch((error) => {
    console.warn(error.message || "Admin authentication failed.");
  });
