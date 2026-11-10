const root = document.documentElement;
const main = document.querySelector("main");
const header = document.querySelector(".header");
const menu = document.querySelector("#site-menu");
const menuButton = document.querySelector(".menu-button");
const search = document.querySelector("#site-search");
const searchButton = document.querySelector(".search-button");
const headerInput = header.querySelector(".search-input");
const overlayInput = search.querySelector(".search-overlay__search-input");
const overlayBack = search.querySelector(".search-overlay__back-button");
const shortcuts = search.querySelector(".demo-search-links");
const popular = search.querySelector(".demo-search-popular");
const results = search.querySelector(".demo-search-results");
const desktop = window.matchMedia("(min-width: 1024px)");
const entries = new Map();
let activeOverlay = null;

const headerBack = overlayBack.cloneNode(true);
headerBack.classList.add("demo-search-back");
headerBack.setAttribute("data-v-f6880830", "");
headerBack.hidden = true;
headerInput.closest(".header__search-field").before(headerBack);
searchButton.setAttribute("aria-controls", search.id);
searchButton.setAttribute("aria-expanded", "false");

for (const link of document.querySelectorAll(
  ".menu-modal .menu-card, .menu-modal .nav-item, .quick-navigation .menu-card, .card__title-link, .demo-search-links a, .demo-search-card",
)) {
  const title = link.textContent.trim().replace(/\s+/g, " ");
  if (title) entries.set(title, link.href);
}

function toggleOverlay(element, open) {
  element.classList.toggle("_visible", open);
  element.inert = !open;
  element.setAttribute("aria-hidden", String(!open));
}

function showOverlay(overlay) {
  if (activeOverlay === null) {
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
  }
  const menuOpen = overlay === menu;
  const searchOpen = overlay === search;
  activeOverlay = overlay;
  root.classList.toggle("ov-hidden", overlay !== null);
  root.classList.toggle("menu-opened", menuOpen);
  main.inert = overlay !== null;
  toggleOverlay(menu, menuOpen);
  toggleOverlay(search, searchOpen);
  menuButton.classList.toggle("_opened", menuOpen);
  menuButton.setAttribute("aria-expanded", String(menuOpen));
  menuButton.setAttribute(
    "aria-label",
    menuOpen ? "Закрыть меню" : "Открыть меню",
  );
  searchButton.setAttribute("aria-expanded", String(searchOpen));
  headerBack.hidden = !searchOpen;
  if (overlay) overlay.scrollTop = 0;
}

function showSearch() {
  if (activeOverlay === search) return;
  showOverlay(search);
  (desktop.matches ? headerInput : overlayInput).focus({ preventScroll: true });
}

function closeSearch() {
  showOverlay(null);
  searchButton.focus({ preventScroll: true });
}

function updateSearch(query) {
  headerInput.value = query;
  overlayInput.value = query;
  const terms = query
    .toLocaleLowerCase("ru")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const isEmpty = terms.length === 0;
  shortcuts.hidden = !isEmpty;
  popular.hidden = !isEmpty;
  results.hidden = isEmpty;
  results.replaceChildren();
  if (isEmpty) return;

  for (const [title, href] of entries) {
    if (terms.every((term) => title.toLocaleLowerCase("ru").includes(term))) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = title;
      results.append(link);
    }
  }
  if (!results.children.length) {
    const empty = document.createElement("p");
    empty.textContent = "На главной ничего не найдено";
    results.append(empty);
  }
}

function updateHeaderOnScroll() {
  header.classList.toggle("header--scrolled", window.scrollY > 0);
}

function syncViewportWidth() {
  // The viewport width stays constant when an overlay locks page scrolling.
  root.style.setProperty("--shell-viewport-width", `${window.innerWidth}px`);
}

syncViewportWidth();
window.addEventListener("resize", syncViewportWidth, { passive: true });
updateHeaderOnScroll();
window.addEventListener("pageshow", updateHeaderOnScroll);
window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });

menuButton.addEventListener("click", () =>
  showOverlay(activeOverlay === menu ? null : menu),
);
searchButton.addEventListener("click", showSearch);
headerInput.addEventListener("focus", showSearch);
headerBack.addEventListener("click", closeSearch);
overlayBack.addEventListener("click", closeSearch);

for (const input of [headerInput, overlayInput]) {
  input.addEventListener("input", () => updateSearch(input.value));
}

desktop.addEventListener("change", () => {
  if (activeOverlay === search)
    (desktop.matches ? headerInput : overlayInput).focus();
});

const posterTrack = menu.querySelector(".swiper-wrapper");
const posterNav = menu.querySelector(".posters-slider-pagination");
const posterButtons = [...posterTrack.children].map((slide) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swiper-pagination-bullet";
  button.setAttribute("aria-label", slide.querySelector("b").textContent);
  button.addEventListener("click", () => {
    posterTrack.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  });
  posterNav.append(button);
  return button;
});

function updatePosterNav() {
  const current = Math.round(
    posterTrack.scrollLeft / (posterTrack.clientWidth || 1),
  );
  posterButtons.forEach((button, index) => {
    button.classList.toggle(
      "swiper-pagination-bullet-active",
      index === current,
    );
    button.classList.toggle("is-prev", index < current && current - index <= 2);
    button.classList.toggle("is-next", index > current && index - current <= 2);
    if (index === current) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

updatePosterNav();
posterTrack.addEventListener("scroll", updatePosterNav, { passive: true });

for (const [index, button] of [
  ...document.querySelectorAll(".footer-worktime__title"),
].entries()) {
  const hours = button.nextElementSibling;
  hours.id = `mall-hours-${index + 1}`;
  button.setAttribute("aria-controls", hours.id);
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    hours.style.display = open ? "" : "none";
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeOverlay) return;
  if (activeOverlay === search) {
    closeSearch();
  } else {
    showOverlay(null);
    menuButton.focus({ preventScroll: true });
  }
});
