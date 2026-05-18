function toggleMenu(){
  const nav = document.getElementById("nav") || document.querySelector(".nav");

  if (!nav) return;

  nav.classList.toggle("active");
}

/* SCROLL REVEAL */

window.addEventListener("scroll", reveal);

function reveal(){
  const reveals = document.querySelectorAll(".reveal");

  for(let i = 0; i < reveals.length; i++){
    const windowHeight = window.innerHeight;
    const revealTop = reveals[i].getBoundingClientRect().top;
    const revealPoint = 100;

    if(revealTop < windowHeight - revealPoint){
      reveals[i].classList.add("active");
    }
  }
}

reveal();

const header = document.querySelector(".header");

function updateHeaderState(){
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 20);
}

window.addEventListener("scroll", updateHeaderState, { passive: true });
updateHeaderState();

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    const nav = document.getElementById("nav") || document.querySelector(".nav");

    if (nav) nav.classList.remove("active");
  });
});

function setupHomeMotion(){
  if (!document.body.classList.contains("home-page")) return;

  const motionItems = document.querySelectorAll([
    ".section-heading",
    ".category-card",
    ".home-product-card",
    ".brand-philosophy-card",
    ".solutions-panel",
    ".advantage-card",
    ".home-contact-section .contact-left",
    ".home-contact-section .contact-card",
    ".home-footer .footer-grid"
  ].join(","));

  motionItems.forEach((item) => item.classList.add("home-motion"));

  if (!("IntersectionObserver" in window)) {
    motionItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px"
  });

  motionItems.forEach((item) => observer.observe(item));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupHomeMotion);
} else {
  setupHomeMotion();
}



function setupCategoryCardLinks(){
  document.querySelectorAll(".brand-category-card[data-category-link]").forEach((card) => {
    if (card.dataset.cardLinkReady === "true") return;

    card.dataset.cardLinkReady = "true";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "link");

    card.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (anchor) return;

      const link = card.dataset.categoryLink;
      if (link) window.location.href = link;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("a")) return;

      event.preventDefault();
      const link = card.dataset.categoryLink;
      if (link) window.location.href = link;
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCategoryCardLinks);
} else {
  setupCategoryCardLinks();
}

window.addEventListener("load", setupCategoryCardLinks);
