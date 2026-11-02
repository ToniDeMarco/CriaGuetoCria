// Medição para tráfego pago: Google Analytics 4, Google Ads e Pixel da Meta.
// Configure os IDs em js/config.js. Sem IDs, este arquivo não faz nada.
// LGPD: nenhum script de terceiros é carregado antes do "Aceitar" no aviso de cookies.
//
// Conversões enviadas:
//   WhatsApp (qualquer link wa.me)      -> GA4 generate_lead · Meta Contact · Ads conversão "whatsapp"
//   Abrir ficha de livro                -> GA4 view_item · Meta ViewContent
//   "Ler na biblioteca" (Drive)         -> GA4 select_content · Meta ViewContent · Ads conversão "leitura"
//   Abrir regulamento de concurso       -> GA4 view_regulation · Meta ViewContent
//   Instagram / YouTube                 -> GA4 click_social
(function () {
  const cfg = (window.CGC_CONFIG && window.CGC_CONFIG.analytics) || {};
  const ids = { ga4: cfg.ga4 || "", ads: cfg.googleAds || "", meta: cfg.metaPixel || "" };
  if (!ids.ga4 && !ids.ads && !ids.meta) return;

  const KEY = "cgc.consent";
  let loaded = false;

  function read() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function save(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }

  function script(src) {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function load() {
    if (loaded) return;
    loaded = true;
    const gtagId = ids.ga4 || ids.ads;
    if (gtagId) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        dataLayer.push(arguments);
      };
      gtag("js", new Date());
      if (ids.ga4) gtag("config", ids.ga4);
      if (ids.ads) gtag("config", ids.ads);
      script("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gtagId));
    }
    if (ids.meta) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[]}(window);
      /* eslint-enable */
      fbq("init", ids.meta);
      fbq("track", "PageView");
      script("https://connect.facebook.net/en_US/fbevents.js");
    }
  }

  // Evento único que vira GA4 + Meta + conversão do Ads, conforme o que estiver configurado.
  function track(ga4Name, metaName, params, adsKey) {
    if (!loaded) return;
    if (window.gtag) {
      if (ids.ga4) gtag("event", ga4Name, params || {});
      const label = adsKey && cfg.adsConversions && cfg.adsConversions[adsKey];
      if (label) gtag("event", "conversion", { send_to: label });
    }
    if (window.fbq && metaName) fbq("track", metaName, params || {});
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    const card = e.target.closest(".book-card");
    if (card) {
      const title = card.querySelector("h3");
      track("view_item", "ViewContent", { content_type: "livro", content_name: title ? title.textContent : card.dataset.id });
    }
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (/wa\.me\//.test(href)) track("generate_lead", "Contact", { method: "whatsapp", page: location.pathname }, "whatsapp");
    else if (/drive\.google\.com/.test(href)) track("select_content", "ViewContent", { content_type: "leitura", content_name: document.title }, "leitura");
    else if (/concurso\.html\?id=/.test(href)) track("view_regulation", "ViewContent", { content_type: "regulamento" });
    else if (/instagram\.com|youtube\.com/.test(href)) track("click_social", null, { link_url: href });
  });

  function banner() {
    const box = document.createElement("div");
    box.className = "consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Aviso de cookies");
    box.innerHTML = `
      <p>Usamos cookies para medir visitas e anúncios e melhorar o que a casa publica. Você escolhe.</p>
      <div class="consent-actions">
        <button class="btn btn-ghost dark" data-c="no">Recusar</button>
        <button class="btn btn-solid" data-c="yes">Aceitar</button>
      </div>`;
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      save(b.dataset.c === "yes" ? "granted" : "denied");
      if (b.dataset.c === "yes") load();
      box.remove();
    });
    document.body.appendChild(box);
  }

  const choice = read();
  if (choice === "granted") load();
  else if (choice !== "denied") {
    // o aviso entra depois que a página já apareceu, sem atrapalhar o carregamento
    if (document.readyState === "complete") banner();
    else window.addEventListener("load", banner);
  }

  window.CGCAnalytics = { track };
})();
