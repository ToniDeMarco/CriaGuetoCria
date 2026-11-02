// Preloader: o contorno do sankofa é desenhado pelo traço e, no fim, o logo colorido aparece.
// Porcentagem e barra acompanham o carregamento real (página, dados do Supabase e imagens).
// Aparece uma vez por visita (sessão do navegador).
// Deve ser o primeiro elemento do <body>, para cobrir a página antes de ela aparecer.
(function () {
  const KEY = "cgc.preloaded";
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
  } catch (e) {}

  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIN_MS = reduced ? 500 : 2200; // duração mínima, para o desenho do logo ser visto
  const MAX_MS = 9000; // se algo travar, termina mesmo assim

  // Contorno da silhueta do sankofa, traçado a partir de assets/sankofa.png (mesmo enquadramento de sankofa-logo.webp).
  const OUTLINE = "M63.9 19.9 L52.0 27.4 L36.2 40.9 L23.2 57.3 L11.3 81.3 L5.5 104.5 L4.4 115.1 L4.4 136.6 L8.6 160.7 L15.5 179.5 L22.4 192.8 L35.4 210.8 L46.5 222.4 L65.8 238.1 L81.6 248.1 L106.2 260.3 L124.2 267.2 L150.2 275.2 L152.4 310.6 L153.5 314.7 L164.8 315.6 L168.2 314.7 L168.2 288.5 L166.8 269.1 L174.8 267.2 L187.0 268.0 L188.9 269.7 L188.9 302.9 L190.0 314.2 L206.3 314.5 L206.3 254.2 L226.8 249.2 L235.6 243.9 L239.8 239.2 L242.6 231.8 L242.3 221.0 L252.8 223.2 L258.6 222.6 L260.5 217.9 L256.9 205.5 L257.5 203.6 L273.0 203.6 L281.0 201.6 L281.3 200.2 L279.3 197.5 L269.4 189.5 L268.3 187.2 L280.4 182.3 L285.2 178.4 L285.4 175.4 L282.7 172.0 L277.7 168.7 L277.7 167.1 L286.0 165.4 L290.1 162.4 L292.1 155.4 L292.3 141.1 L294.6 137.5 L302.0 137.2 L322.8 143.3 L330.0 143.0 L337.1 138.6 L338.0 135.8 L336.6 133.9 L326.9 128.3 L311.7 127.5 L298.7 128.6 L294.6 127.8 L295.7 125.3 L301.7 121.1 L326.9 107.3 L330.5 102.6 L330.8 98.2 L328.6 96.0 L323.9 95.7 L297.3 106.8 L278.0 117.3 L273.3 117.0 L274.4 112.6 L310.0 77.4 L312.5 71.1 L311.7 67.2 L308.1 64.2 L301.5 64.2 L289.9 70.8 L275.5 83.8 L265.2 96.2 L256.7 111.7 L251.7 114.2 L248.6 112.8 L248.6 109.0 L253.9 97.9 L274.4 73.3 L281.0 63.6 L285.4 54.5 L288.5 45.6 L289.0 38.2 L286.8 34.6 L281.8 34.0 L270.8 40.1 L260.0 50.6 L251.7 62.0 L247.3 70.0 L235.1 97.9 L227.3 108.4 L217.1 119.8 L199.7 134.1 L186.1 141.6 L177.3 145.2 L157.1 149.4 L141.1 149.4 L120.3 145.2 L109.2 141.1 L93.2 132.5 L74.7 118.7 L58.6 103.2 L52.0 94.3 L47.8 83.8 L47.8 72.5 L52.0 63.3 L59.2 56.1 L66.1 52.0 L74.1 49.2 L83.5 47.6 L91.3 47.6 L100.7 52.0 L132.2 75.0 L135.0 78.0 L138.3 86.3 L141.1 106.8 L143.3 109.8 L144.9 110.4 L143.0 117.8 L144.1 125.8 L147.1 130.5 L150.5 133.3 L157.6 135.8 L163.2 135.8 L168.7 133.6 L171.5 131.1 L174.8 125.0 L175.6 120.6 L174.0 112.8 L167.3 105.7 L169.3 97.9 L168.2 57.8 L169.5 51.2 L169.8 41.2 L168.2 30.7 L165.1 23.5 L157.6 14.7 L148.2 8.9 L135.2 5.0 L116.7 4.4 L102.6 6.1 L86.3 10.2 Z";

  const root = document.createElement("div");
  root.className = "preloader";
  root.setAttribute("role", "progressbar");
  root.setAttribute("aria-label", "Carregando o site");
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", "100");
  root.innerHTML = `
    <div class="preloader-inner">
      <svg class="preloader-mark" viewBox="0 0 342 320" aria-hidden="true">
        <image href="assets/img/sankofa-logo.webp" width="342" height="320" />
        <path d="${OUTLINE}" pathLength="100" />
      </svg>
      <p class="preloader-name">Cria Gueto Cria</p>
      <p class="preloader-pct"><span>0</span>%</p>
    </div>
    <p class="preloader-caption">Abrindo o acervo</p>
    <div class="preloader-bar"><span></span></div>`;
  document.body.prepend(root);
  document.documentElement.classList.add("is-preloading");

  const outline = root.querySelector("path");
  const logo = root.querySelector("image");
  const pct = root.querySelector(".preloader-pct span");
  const bar = root.querySelector(".preloader-bar span");

  // "target" é o quanto já carregou de fato; enquanto espera, avança devagar até 90%.
  let target = 5;
  let goal = 5;
  let shown = 0;
  const start = performance.now();
  const bump = (v) => (target = Math.max(target, v));

  document.addEventListener("DOMContentLoaded", () => {
    bump(35);
    if (window.CGC) CGC.ready().then(() => bump(75));
  });
  window.addEventListener("load", () => bump(100));
  setTimeout(() => bump(100), MAX_MS);

  const clamp = (v, max = 100) => Math.max(0, Math.min(max, v));

  function render(p) {
    outline.style.strokeDashoffset = 100 - p; // o traço acompanha a porcentagem
    logo.style.opacity = clamp((p - 80) / 20, 1); // as cores entram nos últimos 20%
    pct.textContent = Math.round(p);
    bar.style.transform = "scaleX(" + p / 100 + ")";
    root.setAttribute("aria-valuenow", Math.round(p));
  }

  function tick(now) {
    goal = target >= 100 ? 100 : Math.max(target, Math.min(90, goal + 0.12));
    const want = Math.min(goal, ((now - start) / MIN_MS) * 100);
    shown += (want - shown) * 0.1;
    if (want === 100 && shown > 99.5) shown = 100;
    render(shown);
    if (shown < 100) requestAnimationFrame(tick);
    else finish();
  }

  function finish() {
    root.classList.add("is-done"); // o traço some e fica o logo colorido
    setTimeout(() => {
      document.documentElement.classList.remove("is-preloading"); // libera as animações do hero
      root.classList.add("is-leaving");
      setTimeout(() => root.remove(), 800);
    }, reduced ? 150 : 550);
  }

  requestAnimationFrame(tick);
})();
