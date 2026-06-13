(function () {
  const RFQ_KEY = "linf_rfq_products_v3";
  const WHATSAPP_NUMBER = "8619978036095";

  function readItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RFQ_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(RFQ_KEY, JSON.stringify(items));
    updateRfqCount();
  }

  function normalizeItem(item) {
    const productName = clean(item.product_name || item.name || item.title || "LinfTech Product");
    const productId = clean(item.product_id || item.id || productName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    return {
      product_id: productId,
      product_name: productName,
      product_image: clean(item.product_image || item.image || item.image_url || "logo.png"),
      category: clean(item.category || "Wholesale Accessories"),
      quantity: Math.max(1, Number(item.quantity || 1)),
      notes: clean(item.notes || "")
    };
  }

  function addItem(item) {
    const nextItem = normalizeItem(item);
    const items = readItems();
    const existing = items.find((entry) => String(entry.product_id) === String(nextItem.product_id));
    if (existing) {
      existing.quantity = Math.max(1, Number(existing.quantity || 1)) + Math.max(1, Number(nextItem.quantity || 1));
      if (!existing.notes && nextItem.notes) existing.notes = nextItem.notes;
    } else {
      items.push(nextItem);
    }
    saveItems(items);
    showRfqToast(`${nextItem.product_name} added to RFQ Center.`);
    return items;
  }

  function removeItem(productId) {
    saveItems(readItems().filter((item) => String(item.product_id) !== String(productId)));
    renderRfqPage();
  }

  function updateItem(productId, patch) {
    const items = readItems().map((item) => {
      if (String(item.product_id) !== String(productId)) return item;
      return { ...item, ...patch };
    });
    saveItems(items);
  }

  function countItems() {
    return readItems().reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
  }

  function updateRfqCount() {
    const count = countItems();
    document.querySelectorAll("[data-rfq-count]").forEach((node) => {
      node.textContent = String(count);
    });
    document.querySelectorAll(".rfq-nav-link").forEach((link) => {
      link.setAttribute("aria-label", `RFQ Center with ${count} products`);
    });
  }

  function ensureRfqNav() {
    document.querySelectorAll(".nav").forEach((nav) => {
      if (nav.querySelector(".rfq-nav-link")) return;
      const link = document.createElement("a");
      link.className = "rfq-nav-link";
      link.href = "rfq.html";
      link.innerHTML = 'RFQ Center (<span data-rfq-count>0</span>)';
      nav.appendChild(link);
    });
    updateRfqCount();
  }

  function createButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-to-rfq-btn";
    button.textContent = "Add to RFQ";
    button.dataset.productId = item.product_id || "";
    button.dataset.productName = item.product_name || "";
    button.dataset.productImage = item.product_image || "";
    button.dataset.category = item.category || "";
    return button;
  }

  function ensureStaticProductButtons() {
    document.querySelectorAll(".product-card").forEach((card, index) => {
      if (card.querySelector(".add-to-rfq-btn")) return;
      const name = clean(card.querySelector("h3")?.textContent) || `Product ${index + 1}`;
      const image = card.querySelector("img")?.getAttribute("src") || "logo.png";
      const category = clean(card.querySelector(".product-category-chip")?.textContent) || "Wholesale Accessories";
      const actions = card.querySelector(".product-card-actions") || card.querySelector(".product-info") || card;
      actions.appendChild(createButton({
        product_id: slugify(name),
        product_name: name,
        product_image: image,
        category
      }));
    });
  }

  function readButtonItem(button) {
    return normalizeItem({
      product_id: button.dataset.productId,
      product_name: button.dataset.productName,
      product_image: button.dataset.productImage,
      category: button.dataset.category,
      quantity: button.dataset.quantity || 1,
      notes: button.dataset.notes || ""
    });
  }

  function renderRfqPage() {
    const list = document.getElementById("rfqProductList");
    const empty = document.getElementById("rfqEmptyState");
    if (!list) return;

    const items = readItems();
    if (empty) empty.hidden = items.length > 0;

    if (!items.length) {
      list.innerHTML = "";
      updateRfqCount();
      updateWhatsAppLink();
      return;
    }

    list.innerHTML = items.map((item) => `
      <article class="rfq-product-item" data-product-id="${escapeAttribute(item.product_id)}">
        <img src="${escapeAttribute(item.product_image || "logo.png")}" alt="${escapeAttribute(item.product_name)}" loading="lazy">
        <div class="rfq-product-info">
          <h3>${escapeHtml(item.product_name)}</h3>
          <p>${escapeHtml(item.category || "Wholesale Accessories")}</p>
        </div>
        <label>
          Quantity
          <input type="number" min="1" value="${escapeAttribute(item.quantity || 1)}" data-rfq-field="quantity">
        </label>
        <label>
          Notes
          <input type="text" value="${escapeAttribute(item.notes || "")}" placeholder="Color, model, packaging..." data-rfq-field="notes">
        </label>
        <button type="button" class="rfq-remove-btn" data-remove-rfq="${escapeAttribute(item.product_id)}">Remove</button>
      </article>
    `).join("");
    updateRfqCount();
    updateWhatsAppLink();
  }

  function setupRfqPage() {
    const form = document.getElementById("rfqForm");
    const list = document.getElementById("rfqProductList");
    if (!form || !list) return;

    renderRfqPage();

    list.addEventListener("input", (event) => {
      const field = event.target.closest("[data-rfq-field]");
      if (!field) return;
      const row = field.closest("[data-product-id]");
      if (!row) return;
      const value = field.dataset.rfqField === "quantity"
        ? Math.max(1, Number(field.value || 1))
        : field.value;
      updateItem(row.dataset.productId, { [field.dataset.rfqField]: value });
      updateWhatsAppLink();
    });

    list.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-rfq]");
      if (remove) removeItem(remove.dataset.removeRfq);
    });

    form.addEventListener("input", updateWhatsAppLink);
    form.addEventListener("submit", submitRfq);
    updateWhatsAppLink();
  }

  async function submitRfq(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById("rfqSubmitStatus");
    const items = readItems();
    if (!items.length) {
      setStatus(status, "Please add at least one product to RFQ Center.", true);
      return;
    }

    const formData = new FormData(form);
    const validationMessage = validateRfqForm(formData);
    if (validationMessage) {
      setStatus(status, validationMessage, true);
      return;
    }

    const payload = buildRfqPayload(formData, items);
    setStatus(status, "Submitting RFQ...");

    try {
      if (!window.supabaseClient) throw new Error("Supabase client is not available.");
      await saveRfqInquiry(payload, items);
      localStorage.removeItem(RFQ_KEY);
      form.reset();
      renderRfqPage();
      updateRfqCount();
      setStatus(status, "RFQ submitted successfully. We will contact you soon.");
      showRfqToast("RFQ submitted successfully.");
    } catch (error) {
      setStatus(status, `${error.message || "Failed to submit RFQ."} If this mentions missing columns, run the RFQ SQL migration.`, true);
    }
  }



  async function saveRfqInquiry(payload, items) {
    const fullInsert = await window.supabaseClient.from("inquiries").insert([payload]);
    if (!fullInsert.error) return;

    if (!isMissingInquiryColumnError(fullInsert.error)) throw fullInsert.error;

    const legacyPayload = buildLegacyInquiryPayload(payload, items);
    const legacyInsert = await window.supabaseClient.from("inquiries").insert([legacyPayload]);
    if (!legacyInsert.error) return;

    if (!isMissingInquiryColumnError(legacyInsert.error)) throw legacyInsert.error;

    const minimalPayload = buildMinimalInquiryPayload(payload, items);
    const minimalInsert = await window.supabaseClient.from("inquiries").insert([minimalPayload]);
    if (minimalInsert.error) throw minimalInsert.error;
  }

  function isMissingInquiryColumnError(error) {
    const message = String(error?.message || error?.details || error?.hint || "");
    return /column|schema cache|Could not find|PGRST204|buyer_name|company|country|quantity|status|target_market|expected_quantity|products/i.test(message);
  }

  function buildLegacyInquiryPayload(payload, items) {
    const rfqLines = items.map((item, index) => {
      return `${index + 1}. ${item.product_name} | ${item.category || "-"} | Qty: ${item.quantity || 1} | Notes: ${item.notes || "-"}`;
    }).join("\n");
    const requirementLines = [
      `Country: ${payload.country || "-"}`,
      `Expected Quantity: ${payload.expected_quantity || payload.quantity || "-"}`,
      `OEM Logo Required: ${payload.oem_logo_required || "-"}`,
      `Custom Packaging Required: ${payload.custom_packaging_required || "-"}`,
      `Sample Order Needed: ${payload.sample_order_needed || "-"}`,
      `Delivery Destination: ${payload.delivery_destination || "-"}`
    ].join("\n");

    return {
      name: payload.name || payload.buyer_name || "RFQ Buyer",
      company: "",
      country: payload.country || "",
      email: payload.email || "",
      whatsapp: payload.whatsapp || "",
      product: payload.product || "RFQ Product List",
      quantity: payload.quantity || payload.expected_quantity || "",
      message: [`RFQ Center Submission`, rfqLines, requirementLines, payload.message || ""].filter(Boolean).join("\n\n"),
      status: "new"
    };
  }

  function buildMinimalInquiryPayload(payload, items) {
    const legacy = buildLegacyInquiryPayload(payload, items);
    return {
      name: legacy.name,
      email: legacy.email,
      whatsapp: legacy.whatsapp,
      product: legacy.product,
      message: legacy.message
    };
  }

  function validateRfqForm(formData) {
    const buyerName = clean(formData.get("buyer_name"));
    const country = clean(formData.get("country"));
    const email = clean(formData.get("email"));
    const whatsapp = clean(formData.get("whatsapp"));

    if (!buyerName) return "Please enter your name.";
    if (!country) return "Please enter your country.";
    if (!email && !whatsapp) return "Please enter either Email or WhatsApp.";
    return "";
  }

  function buildRfqPayload(formData, items) {
    const buyerName = clean(formData.get("buyer_name"));
    const expectedQuantity = clean(formData.get("expected_quantity"));
    const message = clean(formData.get("message"));
    const productsSummary = items.map((item) => `${item.product_name} x ${item.quantity || 1}${item.notes ? ` (${item.notes})` : ""}`).join("; ");

    return {
      buyer_name: buyerName,
      name: buyerName,
      company: "",
      country: clean(formData.get("country")),
      email: clean(formData.get("email")),
      whatsapp: clean(formData.get("whatsapp")),
      website: "",
      target_market: "",
      expected_quantity: expectedQuantity,
      quantity: expectedQuantity,
      oem_logo_required: clean(formData.get("oem_logo_required")),
      custom_packaging_required: clean(formData.get("custom_packaging_required")),
      sample_order_needed: clean(formData.get("sample_order_needed")),
      delivery_destination: clean(formData.get("delivery_destination")),
      product: productsSummary,
      message,
      products: items,
      status: "new"
    };
  }

  function buildWhatsAppMessage() {
    const form = document.getElementById("rfqForm");
    const formData = form ? new FormData(form) : new FormData();
    const items = readItems();
    const lines = [
      "Hello LinfTech, I would like to request a quotation.",
      "",
      "RFQ Product List:"
    ];

    if (items.length) {
      items.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.product_name}`);
        lines.push(`   Category: ${item.category || "-"}`);
        lines.push(`   Quantity: ${item.quantity || 1}`);
        if (item.notes) lines.push(`   Notes: ${item.notes}`);
      });
    } else {
      lines.push("No products selected yet.");
    }

    lines.push("", "Buyer Information:");
    [
      ["Name", formData.get("buyer_name")],
      ["Country", formData.get("country")],
      ["Email", formData.get("email")],
      ["WhatsApp", formData.get("whatsapp")]
    ].forEach(([label, value]) => { if (clean(value)) lines.push(`${label}: ${clean(value)}`); });

    lines.push("", "Purchase Requirements:");
    [
      ["Expected Quantity", formData.get("expected_quantity")],
      ["OEM Logo Required", formData.get("oem_logo_required")],
      ["Custom Packaging Required", formData.get("custom_packaging_required")],
      ["Sample Order Needed", formData.get("sample_order_needed")],
      ["Delivery Destination", formData.get("delivery_destination")],
      ["Message", formData.get("message")]
    ].forEach(([label, value]) => { if (clean(value)) lines.push(`${label}: ${clean(value)}`); });

    return lines.join("\n");
  }

  function updateWhatsAppLink() {
    const link = document.getElementById("sendRfqWhatsApp");
    if (!link) return;
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
  }

  function setStatus(node, message, isError = false) {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("is-error", isError);
  }

  function showRfqToast(message) {
    let toast = document.getElementById("rfqToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rfqToast";
      toast.className = "rfq-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showRfqToast.timer);
    showRfqToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function slugify(value) {
    return clean(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  window.LINF_RFQ = {
    addProduct: addItem,
    readItems,
    saveItems,
    updateCount: updateRfqCount,
    renderPage: renderRfqPage
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-rfq-btn");
    if (!button) return;
    event.preventDefault();
    addItem(readButtonItem(button));
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureRfqNav();
    ensureStaticProductButtons();
    setupRfqPage();
    updateRfqCount();
  });

  window.addEventListener("storage", updateRfqCount);
})();



