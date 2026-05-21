(function () {
  const LANGUAGES = [
    { code: "en", label: "EN" },
    { code: "zh", label: "中文" },
    { code: "fr", label: "FR" },
    { code: "ar", label: "AR" },
    { code: "es", label: "ES" },
    { code: "es-MX", label: "MX" },
    { code: "ja", label: "日本語" }
  ];
  const STORAGE_KEY = "linftech_language";
  const KEY_ALIASES = {
    "CHINA-BASED OEM / ODM SUPPLIER": "China-Based Supplier",
    "OUR PRODUCTS": "Product Categories",
    "OEM & ODM SERVICE": "OEM / Wholesale Solutions",
    "FACTORY STRENGTH": "Factory Showcase",
    "PRODUCT VIDEO": "Factory Showcase",
    "RELATED PRODUCTS": "RELATED PRODUCTS",
    "Wholesale Mobile Accessories": "Wholesale Mobile Accessories Supplier",
    "for Global Buyers": "Built for Global B2B Buyers",
    "All Products": "Products",
    "Contact LinfTech for OEM / ODM samples, mixed orders, custom packaging and distributor pricing.": "Ready to Source Mobile Accessories?",
    "Professional Factory Advantages": "Professional OEM Manufacturer",
    "SCREEN PROTECTOR": "Screen Protectors",
    "Premium Tempered Glass Screen Protector": "Hydrogel Screen Protection",
    "WhatsApp Quick Contact": "WhatsApp Contact",
    "Factory": "Factory Showcase"
  };
  const nodeOriginals = new WeakMap();
  let currentMessages = {};
  let currentLang = "en";
  let translating = false;

  function getInitialLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((item) => item.code === saved)) return saved;

    const browserLang = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    if (browserLang === "es-mx" || browserLang.startsWith("es-mx")) return "es-MX";
    if (browserLang.startsWith("zh")) return "zh";
    if (browserLang.startsWith("fr")) return "fr";
    if (browserLang.startsWith("ar")) return "ar";
    if (browserLang.startsWith("ja")) return "ja";
    if (browserLang.startsWith("es")) return "es";
    return "en";
  }

  async function loadMessages(lang) {
    try {
      const response = await fetch(`locales/${lang}.json`, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Locale ${lang} unavailable`);
      return await response.json();
    } catch (error) {
      if (lang !== "en") return loadMessages("en");
      return { locale: "en", dir: "ltr", strings: {} };
    }
  }

  function createLanguageSelector() {
    if (document.querySelector(".language-switcher")) return;

    const header = document.querySelector(".header");
    if (!header) return;

    const wrap = document.createElement("label");
    wrap.className = "language-switcher";
    wrap.setAttribute("aria-label", "Language");

    const select = document.createElement("select");
    select.className = "language-select";

    LANGUAGES.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.code;
      option.textContent = item.label;
      select.appendChild(option);
    });

    select.addEventListener("change", () => setLanguage(select.value));
    wrap.appendChild(select);

    const menuButton = header.querySelector(".menu-btn");
    if (menuButton) {
      header.insertBefore(wrap, menuButton);
    } else {
      header.appendChild(wrap);
    }
  }

  function translateText(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    const key = KEY_ALIASES[normalized] || normalized;
    return currentMessages[key] || normalized;
  }

  function translateTextNode(node) {
    const original = nodeOriginals.get(node) || node.nodeValue;
    const clean = String(original || "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    if (!nodeOriginals.has(node)) nodeOriginals.set(node, clean);

    const translated = translateText(clean);
    node.nodeValue = original.replace(clean, translated);
  }

  function translateAttributes(element) {
    ["placeholder", "aria-label", "title"].forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      const originalAttr = `data-i18n-original-${attr}`;
      if (!element.hasAttribute(originalAttr)) element.setAttribute(originalAttr, element.getAttribute(attr));
      element.setAttribute(attr, translateText(element.getAttribute(originalAttr)));
    });
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest("script,style,noscript,select,option,.language-switcher"));
  }

  function applyTranslations(root = document.body) {
    if (!root) return;
    translating = true;

    document.documentElement.lang = currentLang;
    const isRtl = currentLang === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", isRtl);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);

    root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach(translateAttributes);
    updateDocumentMeta();
    syncSelector();
    translating = false;
  }

  function updateDocumentMeta() {
    const path = location.pathname.split("/").pop() || "index.html";
    if (path === "product.html") {
      document.title = `${translateText("Wholesale Product Catalog")} | LinfTech`;
    } else if (path === "product-detail.html") {
      document.title = `${translateText("Product Details")} | LinfTech`;
    } else {
      document.title = `${translateText("Wholesale Mobile Accessories Supplier")} | LinfTech`;
    }
  }

  function syncSelector() {
    const select = document.querySelector(".language-select");
    if (select) select.value = currentLang;
  }

  function addHreflang() {
    const head = document.head;
    if (!head || document.querySelector("link[hreflang]")) return;
    const baseUrl = `${location.origin}${location.pathname}`;
    LANGUAGES.forEach((item) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = item.code;
      link.href = `${baseUrl}?lang=${encodeURIComponent(item.code)}`;
      head.appendChild(link);
    });
    const fallback = document.createElement("link");
    fallback.rel = "alternate";
    fallback.hreflang = "x-default";
    fallback.href = baseUrl;
    head.appendChild(fallback);
  }

  async function setLanguage(lang) {
    currentLang = LANGUAGES.some((item) => item.code === lang) ? lang : "en";
    localStorage.setItem(STORAGE_KEY, currentLang);
    const locale = await loadMessages(currentLang);
    currentMessages = locale.strings || {};
    applyTranslations();
  }

  function watchDomChanges() {
    const observer = new MutationObserver((mutations) => {
      if (translating) return;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) applyTranslations(node);
          if (node.nodeType === Node.TEXT_NODE && !shouldSkip(node)) translateTextNode(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function initI18n() {
    createLanguageSelector();
    addHreflang();
    const paramLang = new URLSearchParams(location.search).get("lang");
    const lang = paramLang || getInitialLanguage();
    await setLanguage(lang);
    watchDomChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
  } else {
    initI18n();
  }
})();
