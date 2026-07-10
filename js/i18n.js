/* ==========================================================================
   vivahaa — i18n ENGINE
   Loads /locales/en.json and /locales/hi.json and swaps every element
   marked with data-i18n="dot.path.key" (and data-i18n-placeholder /
   data-i18n-title) without a page reload.
   ========================================================================== */

const I18N = (() => {
  const STORAGE_KEY = "vivahaa_lang";
  const SUPPORTED = ["en", "hi"];
  const FALLBACK_STRINGS = {
    // Minimal inline fallback used only if fetch() cannot reach /locales
    // (e.g. the page was opened directly via file:// instead of a server).
    en: { nav: { home: "Home", planMyWedding: "Plan My Wedding" }, meta: { siteName: "vivahaa" } },
    hi: { nav: { home: "होम", planMyWedding: "मेरी शादी प्लान करें" }, meta: { siteName: "विवाह" } }
  };

  let currentLang = localStorage.getItem(STORAGE_KEY) || "en";
  let dict = {};
  const listeners = [];

  async function loadDict() {
    try {
      const res = await fetch(`locales/${currentLang}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error("Network response not OK");
      dict = await res.json();
    } catch (err) {
      console.warn("[i18n] Could not fetch locale JSON (serve this project over http, not file://). Using minimal fallback strings.", err);
      dict = FALLBACK_STRINGS[currentLang] || FALLBACK_STRINGS.en;
    }
  }

  function get(path, fallback = "") {
    const parts = path.split(".");
    let node = dict;
    for (const p of parts) {
      if (node && typeof node === "object" && p in node) {
        node = node[p];
      } else {
        return fallback || path;
      }
    }
    return typeof node === "string" ? node : fallback || path;
  }

  function applyToDom(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = get(key);
    });
    root.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      el.innerHTML = get(key);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.setAttribute("placeholder", get(el.getAttribute("data-i18n-placeholder")));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.setAttribute("title", get(el.getAttribute("data-i18n-title")));
    });
    root.querySelectorAll("[data-i18n-aria]").forEach(el => {
      el.setAttribute("aria-label", get(el.getAttribute("data-i18n-aria")));
    });
    document.documentElement.setAttribute("lang", currentLang);
    document.documentElement.setAttribute("dir", "ltr"); // Hindi (Devanagari) is LTR too
    document.querySelectorAll(".lang-switch button, .mobile-drawer .lang-switch button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === currentLang);
    });
  }

  async function setLang(lang) {
    if (lang === currentLang) return;
    currentLang = SUPPORTED.includes(lang) ? lang : "en";
    localStorage.setItem(STORAGE_KEY, currentLang);
    await loadDict();
    applyToDom();
    listeners.forEach(fn => fn(currentLang));
    document.dispatchEvent(new CustomEvent("vivahaa:langchange", { detail: { lang: currentLang } }));
  }

  function onChange(fn) { listeners.push(fn); }
  function t(path, fallback) { return get(path, fallback); }
  function lang() { return currentLang; }

  async function init() {
    await loadDict();
    applyToDom();
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang]");
      if (btn) setLang(btn.dataset.lang);
    });
  }

  return { init, setLang, t, lang, applyToDom, onChange };
})();
