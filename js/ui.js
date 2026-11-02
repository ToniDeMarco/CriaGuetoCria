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
        <span class="topbar-handle">${escapeHtml(s.instagramHandle)}</span>
        <span class="topbar-line"></span>
        <span>Editora · ${escapeHtml(s.city)}</span>
      </div>
      <header class="site-header">
        <a class="brand" href="index.html" title="Início">
          <span class="brand-mark" aria-hidden="true">
            <img src="assets/img/sankofa-mark.webp" alt="" width="49" height="46" />
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
            <p class="footer-tag">${escapeHtml(s.tagline)}</p>
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
            <a href="${escapeHtml(s.instagram)}" target="_blank" rel="noopener">Instagram ${escapeHtml(s.instagramHandle)}</a>
            <a href="${escapeHtml(s.youtube)}" target="_blank" rel="noopener">YouTube</a>
            <a href="${waLink(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
            <a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a>
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

  // Cabeçalho e rodapé. O build já deixa os dois no HTML (para buscadores e IAs que não rodam
  // JavaScript); aqui eles são refeitos com os dados ao vivo, sem duplicar o rodapé.
  function mountChrome(page) {
    const s = CGC.settings();
    const mount = $("#site-chrome");
    if (mount) {
      mount.innerHTML = headerHTML(page, s);
      $$(".site-footer, .wa-float").forEach((el) => el.remove());
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

  // Faixa infinita: clona o grupo até cobrir a tela e rola exatamente a largura de um grupo,
  // para emendar sem salto. Velocidade constante (px por segundo) em qualquer largura de tela.
  function marquee(root, speed = 45) {
    const track = root && $(".lines-track", root);
    const group = track && $(".lines-group", track);
    if (!group) return;
    function build() {
      $$("[data-clone]", track).forEach((el) => el.remove());
      const w = group.getBoundingClientRect().width;
      if (!w) return;
      for (let i = Math.ceil(root.clientWidth / w); i >= 0; i--) {
        const copy = group.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.setAttribute("data-clone", "");
        track.appendChild(copy);
      }
      track.style.setProperty("--loop", w + "px");
      track.style.setProperty("--dur", w / speed + "s");
    }
    build();
    if (document.fonts) document.fonts.ready.then(build); // a largura muda quando a fonte carrega
    let timer;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(build, 200);
    });
  }

  function coverStyle(book, i = 0) {
    const hues = [8, 18, 28, 350, 205, 32, 12, 22];
    const h = hues[(book.title.length + (book.year || 0) + i) % hues.length];
    return `--h:${h}`;
  }

  // Imagem da capa por cima da capa desenhada; se não carregar, some e fica a desenhada.
  // width: largura da miniatura pedida ao Drive (cards ~ 240px na tela, ficha ~ 380px; o dobro para telas retina).
  function coverImg(book, width = 480) {
    const src = CGC.coverImage(book.coverUrl, width);
    if (!src) return "";
    return `<img class="book-cover-img" src="${escapeHtml(src)}" alt="Capa de ${escapeHtml(book.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-image');this.remove()" />`;
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

  // Card de edital. "full" é a versão da página de concursos (com data de publicação).
  function contestCard(c, full = false) {
    const meta = full
      ? `${escapeHtml(c.category)} · publicado ${formatDate(c.publishedAt)} · prazo ${formatDate(c.deadline)}`
      : `${escapeHtml(c.category)} · ${formatDate(c.deadline)}`;
    const btn = full ? `<a class="btn btn-solid" href="concurso.html?id=${encodeURIComponent(c.id)}">Abrir regulamento</a>`
      : `<a class="btn btn-ghost dark" href="concurso.html?id=${encodeURIComponent(c.id)}">Ler regulamento</a>`;
    return `
        <article class="contest-card">
          <span class="pill">${statusLabel(CGC.statusOf(c))}</span>
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.excerpt)}</p>
          <p class="meta">${meta}</p>
          <p>${btn}</p>
        </article>`;
  }

  function contactCards(s) {
    return `
        <a class="contact-card" href="${escapeHtml(s.instagram)}" target="_blank" rel="noopener">
          <p class="eyebrow">Rede</p>
          <h3>Instagram</h3>
          <p>${escapeHtml(s.instagramHandle)}</p>
          <p>Bastidores, lançamentos e lives da casa.</p>
        </a>
        <a class="contact-card" href="${waLink(s.whatsapp)}" target="_blank" rel="noopener">
          <p class="eyebrow">Conversa</p>
          <h3>WhatsApp</h3>
          <p>+${escapeHtml(s.whatsapp)}</p>
          <p>Pedidos do acervo, imprensa e suporte aos concursos.</p>
        </a>
        <a class="contact-card" href="${escapeHtml(s.youtube)}" target="_blank" rel="noopener">
          <p class="eyebrow">Vídeo</p>
          <h3>YouTube</h3>
          <p>Canal da editora</p>
          <p>Leituras, mesas e o making-of dos livros.</p>
        </a>`;
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
            ${coverImg(book, 800)}
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
    marquee,
    contestCard,
    contactCards,
    headerHTML,
    footerHTML,
  };
})();
