(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function waLink(phone, text) {
    const msg = encodeURIComponent(text || "Olá, Cria Gueto Cria. Vim pelo site.");
    return "https://wa.me/" + String(phone).replace(/\D/g, "") + "?text=" + msg;
  }

  function headerHTML(page, s) {
    return `
      <div class="topbar">
        <span class="topbar-handle">${s.instagramHandle}</span>
        <span class="topbar-line"></span>
        <span>Editora · ${escapeHtml(s.city)}</span>
      </div>
      <header class="site-header">
        <a class="brand" href="index.html" aria-label="Cria Gueto Cria — início">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="36" height="36">
              <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M32 8 L36 24 L52 24 L39 34 L44 50 L32 40 L20 50 L25 34 L12 24 L28 24 Z" fill="currentColor"/>
            </svg>
          </span>
          <span class="brand-text">
            <strong>Cria Gueto Cria</strong>
            <em>editora</em>
          </span>
        </a>
        <button class="nav-toggle" aria-label="Abrir menu" aria-expanded="false">
          <span></span><span></span>
        </button>
        <nav class="nav">
          <a href="index.html" class="${page === "home" ? "is-active" : ""}">Início</a>
          <a href="biblioteca.html" class="${page === "biblioteca" ? "is-active" : ""}">Biblioteca</a>
          <a href="concursos.html" class="${page === "concursos" ? "is-active" : ""}">Concursos</a>
          <a href="sobre.html" class="${page === "sobre" ? "is-active" : ""}">A editora</a>
          <a href="contato.html" class="${page === "contato" ? "is-active" : ""}">Contato</a>
        </nav>
        <a class="header-cta" href="${waLink(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
      </header>`;
  }

  function footerHTML(s) {
    return `
      <footer class="site-footer">
        <div class="footer-grid">
          <div>
            <p class="footer-brand">Cria Gueto Cria</p>
            <p class="footer-tag">${s.tagline}</p>
          </div>
          <div>
            <p class="footer-k">Casa</p>
            <a href="biblioteca.html">Biblioteca digital</a>
            <a href="concursos.html">Regulamentos</a>
            <a href="sobre.html">Manifesto</a>
            <a href="admin.html">Área da editora</a>
          </div>
          <div>
            <p class="footer-k">Redes</p>
            <a href="${s.instagram}" target="_blank" rel="noopener">Instagram ${s.instagramHandle}</a>
            <a href="${s.youtube}" target="_blank" rel="noopener">YouTube</a>
            <a href="${waLink(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
            <a href="mailto:${s.email}">${s.email}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Cria Gueto Cria. Todos os direitos das autoras.</span>
          <span>Publicar é território.</span>
        </div>
      </footer>
      <a class="wa-float" href="${waLink(s.whatsapp)}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.74.46 3.44 1.34 4.94L2 22l5.37-1.4a10 10 0 0 0 4.67 1.18h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.76 14.16c-.24.68-1.4 1.26-1.93 1.34-.5.08-1.12.14-1.8-.11-.41-.16-.94-.3-1.62-.6-2.85-1.23-4.7-4.1-4.84-4.3-.14-.18-1.16-1.54-1.16-2.94 0-1.4.74-2.08 1-2.36.24-.26.54-.34.72-.34h.52c.16 0 .4-.06.62.48.24.56.8 1.94.86 2.08.08.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.42.48-.14.14-.28.28-.12.54.16.26.7 1.16 1.5 1.88 1.04.92 1.9 1.2 2.18 1.34.26.14.42.12.58-.06.16-.18.68-.8.86-1.08.18-.26.36-.22.6-.12.26.08 1.64.78 1.92.92.28.14.46.22.52.34.08.12.08.7-.16 1.38Z"/></svg>
      </a>`;
  }

  function mountChrome(page) {
    const s = CGC.settings();
    const mount = $("#site-chrome");
    if (mount) {
      mount.innerHTML = headerHTML(page, s);
      document.body.insertAdjacentHTML("beforeend", footerHTML(s));
    }
    const toggle = $(".nav-toggle");
    const nav = $(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }
    const total = CGC.books().length;
    $$("[data-book-count]").forEach((el) => (el.textContent = total));
    document.documentElement.style.setProperty("--ig", s.instagramHandle);
  }

  function coverStyle(book, i = 0) {
    const hues = [8, 18, 28, 350, 205, 32, 12, 22];
    const h = hues[(book.title.length + (book.year || 0) + i) % hues.length];
    return `--h:${h}`;
  }

  // Imagem da capa por cima da capa desenhada; se não carregar, some e fica a desenhada.
  function coverImg(book) {
    const src = CGC.coverImage(book.coverUrl);
    if (!src) return "";
    return `<img class="book-cover-img" src="${escapeHtml(src)}" alt="Capa de ${escapeHtml(book.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-image');this.remove()" />`;
  }

  function coverClass(book, extra = "") {
    return "book-cover" + extra + (book.coverUrl ? " has-image" : "");
  }

  function bookCard(book, i) {
    return `
      <article class="book-card" style="${coverStyle(book, i)}" data-id="${book.id}">
        <div class="${coverClass(book)}">
          ${coverImg(book)}
          <span class="book-cover-kicker">Cria Gueto Cria</span>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.author)}</p>
          <span class="book-cover-meta">${book.year} · ${escapeHtml(book.genre)}</span>
        </div>
        <div class="book-meta">
          <span>${escapeHtml(book.territory)}</span>
          <span>${book.pages} pág.</span>
        </div>
      </article>`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "Fluxo contínuo";
    const [y, m, d] = iso.split("-");
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${d} ${months[Number(m) - 1]} ${y}`;
  }

  function statusLabel(s) {
    return { aberto: "Inscrições abertas", continuo: "Chamada contínua", encerrado: "Encerrado" }[s] || s;
  }

  function openBookModal(id) {
    const book = CGC.book(id);
    if (!book) return;
    const s = CGC.settings();
    const preview = CGC.drivePreview(book.driveUrl);
    const modal = document.createElement("div");
    modal.className = "modal-root";
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="book-title">
        <button class="modal-close" aria-label="Fechar">×</button>
        <div class="modal-grid">
          <div class="${coverClass(book, " lg")}" style="${coverStyle(book)}">
            ${coverImg(book)}
            <span class="book-cover-kicker">Cria Gueto Cria</span>
            <h3 id="book-title">${escapeHtml(book.title)}</h3>
            <p>${escapeHtml(book.author)}</p>
            <span class="book-cover-meta">${book.year} · ${escapeHtml(book.genre)}</span>
          </div>
          <div class="modal-body">
            <p class="eyebrow">${escapeHtml(book.territory)} · ${escapeHtml(book.genre)}</p>
            <h2>${escapeHtml(book.title)}</h2>
            <p class="by">por <strong>${escapeHtml(book.author)}</strong></p>
            <p class="synopsis">${escapeHtml(book.synopsis)}</p>
            <ul class="facts">
              <li><span>ISBN</span> ${escapeHtml(book.isbn || "—")}</li>
              <li><span>Ano</span> ${book.year}</li>
              <li><span>Páginas</span> ${book.pages}</li>
            </ul>
            <div class="modal-actions">
              <a class="btn btn-solid" href="${preview || book.driveUrl}" target="_blank" rel="noopener">Ler na biblioteca</a>
              <a class="btn btn-ghost" href="${waLink(s.whatsapp, "Quero saber sobre o livro: " + book.title)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>
            </div>
            <p class="fine">O original digital está no acervo da editora (Google Drive). O link abre a pasta ou o arquivo compartilhado.</p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("is-on"));
    const esc = (e) => {
      if (e.key === "Escape") close();
    };
    const close = () => {
      document.removeEventListener("keydown", esc);
      modal.classList.remove("is-on");
      setTimeout(() => modal.remove(), 280);
    };
    $(".modal-close", modal).addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", esc);
  }

  window.CGCUI = {
    $,
    $$,
    mountChrome,
    bookCard,
    escapeHtml,
    formatDate,
    statusLabel,
    openBookModal,
    waLink,
    coverStyle,
    coverImg,
    coverClass,
  };
})();
