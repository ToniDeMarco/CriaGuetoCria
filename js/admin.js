(function () {
  const view = document.getElementById("view");
  const login = document.getElementById("login-screen");
  const shell = document.getElementById("admin-shell");
  const err = document.getElementById("err");
  const loginBtn = document.getElementById("do-login");

  function show(id) {
    document.querySelectorAll(".linkish").forEach((b) => b.classList.toggle("is-on", b.dataset.view === id));
    const map = { dash: dash, books: books, contests: contests, settings: settings };
    (map[id] || dash)();
  }

  // Executa uma gravação no Supabase travando o botão e avisando se der erro.
  async function run(btn, fn) {
    if (btn) btn.disabled = true;
    try {
      await fn();
      return true;
    } catch (e) {
      alert("Não foi possível salvar: " + e.message);
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function dash() {
    const data = CGC.get();
    view.innerHTML = `
      <h1>Redação</h1>
      ${CGC.source === "erro" ? `<p class="warn">Falha ao carregar o banco (${CGCUI.escapeHtml(CGC.error)}). Os números abaixo são do catálogo inicial, não do site publicado.</p>` : ""}
      <div class="stats">
        <div class="stat"><b>${data.books.length}</b>livros no acervo</div>
        <div class="stat"><b>${data.contests.length}</b>editais publicados</div>
        <div class="stat"><b>${data.contests.filter((c) => CGC.statusOf(c) !== "encerrado").length}</b>chamadas ativas</div>
      </div>
      <p>Esta área alimenta o site público. Os livros apontam para o Google Drive da editora. Os concursos publicam o regulamento integral.</p>
      <p class="warn">O que você salva aqui vai direto para o site. Editais com prazo vencido aparecem como encerrados automaticamente. Troque o WhatsApp, Instagram e YouTube em Configurações.</p>
    `;
  }

  function books() {
    const rows = CGC.books()
      .map(
        (b) => `<tr>
        <td>${CGCUI.escapeHtml(b.title)}</td>
        <td>${CGCUI.escapeHtml(b.author)}</td>
        <td>${CGCUI.escapeHtml(b.genre)}</td>
        <td>${b.year}</td>
        <td>${b.coverUrl ? "Sim" : "—"}</td>
        <td class="row-actions">
          <button class="btn btn-ghost light" data-edit="${b.id}">Editar</button>
          <button class="btn btn-ghost light" data-del="${b.id}">Apagar</button>
        </td>
      </tr>`
      )
      .join("");
    view.innerHTML = `
      <h1>Biblioteca</h1>
      <p><button class="btn btn-solid" id="new-book">Novo livro</button></p>
      <div style="overflow:auto"><table class="table"><thead><tr>
        <th>Título</th><th>Autora</th><th>Gênero</th><th>Ano</th><th>Capa</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>
      <div id="form"></div>
    `;
    view.querySelector("#new-book").onclick = () => bookForm(null);
    view.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => bookForm(CGC.book(b.dataset.edit))));
    view.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      if (confirm("Apagar este título do acervo?") && (await run(b, () => CGC.deleteBook(b.dataset.del)))) books();
    }));
  }

  function bookForm(book) {
    const b = book || {
      title: "", author: "", year: new Date().getFullYear(), genre: "Poesia",
      territory: "Raízes", pages: 120, isbn: "", driveUrl: "", synopsis: "",
    };
    const form = document.getElementById("form");
    form.innerHTML = `
      <h2 style="font-family:var(--display)">${book ? "Editar título" : "Novo título"}</h2>
      <div class="field"><span>Título</span><input id="t" value="${CGCUI.escapeHtml(b.title)}" /></div>
      <div class="field"><span>Autora</span><input id="a" value="${CGCUI.escapeHtml(b.author)}" /></div>
      <div class="field"><span>Ano</span><input id="y" type="number" value="${b.year}" /></div>
      <div class="field"><span>Gênero</span>
        <select id="g">${["Poesia","Romance","Ensaio","Contos","Memória","Infantojuvenil","Antologia","Teatro"].map((x) => `<option ${x===b.genre?"selected":""}>${x}</option>`).join("")}</select>
      </div>
      <div class="field"><span>Linha editorial</span>
        <select id="tr">${["Raízes","Travessias","Ancestralidade","Vivências"].map((x) => `<option ${x===b.territory?"selected":""}>${x}</option>`).join("")}</select>
      </div>
      <div class="field"><span>Páginas</span><input id="p" type="number" value="${b.pages}" /></div>
      <div class="field"><span>ISBN</span><input id="i" value="${CGCUI.escapeHtml(b.isbn || "")}" /></div>
      <div class="field"><span>Link do Google Drive</span><input id="d" value="${CGCUI.escapeHtml(b.driveUrl || "")}" placeholder="https://drive.google.com/..." /></div>
      <div class="field"><span>Capa — link da imagem no Google Drive (compartilhada como "Qualquer pessoa com o link"). Vazio usa a capa desenhada.</span><input id="cv" value="${CGCUI.escapeHtml(b.coverUrl || "")}" placeholder="https://drive.google.com/file/d/.../view" /></div>
      <div id="cover-preview" style="width:160px;margin:0 0 18px"></div>
      <div class="field"><span>Sinopse</span><textarea id="s">${CGCUI.escapeHtml(b.synopsis)}</textarea></div>
      <button class="btn btn-solid" id="save">Publicar no acervo</button>
    `;
    const cover = document.getElementById("cv");
    const preview = document.getElementById("cover-preview");
    const renderPreview = () => {
      const draft = { ...b, title: document.getElementById("t").value || "Título", author: document.getElementById("a").value, coverUrl: cover.value.trim() };
      preview.innerHTML = `<div class="${CGCUI.coverClass(draft)}" style="${CGCUI.coverStyle(draft)}">
        ${CGCUI.coverImg(draft)}
        <span class="book-cover-kicker">Cria Gueto Cria</span>
        <h3>${CGCUI.escapeHtml(draft.title)}</h3>
        <p>${CGCUI.escapeHtml(draft.author)}</p>
      </div>`;
    };
    cover.addEventListener("input", renderPreview);
    renderPreview();
    const save = form.querySelector("#save");
    save.onclick = async () => {
      const ok = await run(save, () => CGC.upsertBook({
        ...b,
        title: document.getElementById("t").value.trim(),
        author: document.getElementById("a").value.trim(),
        year: Number(document.getElementById("y").value),
        genre: document.getElementById("g").value,
        territory: document.getElementById("tr").value,
        pages: Number(document.getElementById("p").value),
        isbn: document.getElementById("i").value.trim(),
        driveUrl: document.getElementById("d").value.trim(),
        coverUrl: cover.value.trim(),
        synopsis: document.getElementById("s").value.trim(),
      }));
      if (ok) books();
    };
    form.scrollIntoView({ behavior: "smooth" });
  }

  function contests() {
    const rows = CGC.contests()
      .map(
        (c) => `<tr>
        <td>${CGCUI.escapeHtml(c.title)}</td>
        <td>${CGCUI.statusLabel(CGC.statusOf(c))}</td>
        <td>${CGCUI.formatDate(c.deadline)}</td>
        <td class="row-actions">
          <button class="btn btn-ghost light" data-edit="${c.id}">Editar</button>
          <button class="btn btn-ghost light" data-del="${c.id}">Apagar</button>
        </td>
      </tr>`
      )
      .join("");
    view.innerHTML = `
      <h1>Concursos</h1>
      <p><button class="btn btn-solid" id="new-c">Novo regulamento</button></p>
      <div style="overflow:auto"><table class="table"><thead><tr>
        <th>Edital</th><th>Status</th><th>Prazo</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>
      <div id="form"></div>
    `;
    view.querySelector("#new-c").onclick = () => contestForm(null);
    view.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => contestForm(CGC.contest(b.dataset.edit))));
    view.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      if (confirm("Apagar este edital?") && (await run(b, () => CGC.deleteContest(b.dataset.del)))) contests();
    }));
  }

  function contestForm(item) {
    const c = item || {
      title: "", status: "aberto", category: "Poesia", deadline: "", excerpt: "", regulation: "<h2>1. Do objeto</h2><p></p>",
    };
    const form = document.getElementById("form");
    form.innerHTML = `
      <h2 style="font-family:var(--display)">${item ? "Editar edital" : "Novo edital"}</h2>
      <div class="field"><span>Título</span><input id="t" value="${CGCUI.escapeHtml(c.title)}" /></div>
      <div class="field"><span>Categoria</span><input id="cat" value="${CGCUI.escapeHtml(c.category)}" /></div>
      <div class="field"><span>Status</span>
        <select id="st">
          <option value="aberto" ${c.status==="aberto"?"selected":""}>Inscrições abertas</option>
          <option value="continuo" ${c.status==="continuo"?"selected":""}>Chamada contínua</option>
          <option value="encerrado" ${c.status==="encerrado"?"selected":""}>Encerrado</option>
        </select>
      </div>
      <div class="field"><span>Prazo (AAAA-MM-DD) — vazio se contínuo. Depois do prazo, o edital aparece como encerrado.</span><input id="dl" value="${CGCUI.escapeHtml(c.deadline || "")}" /></div>
      <div class="field"><span>Resumo na vitrine</span><textarea id="ex">${CGCUI.escapeHtml(c.excerpt)}</textarea></div>
      <div class="field"><span>Regulamento (HTML simples: h2, p, ul, li, strong, em)</span><textarea id="rg" style="min-height:220px">${CGCUI.escapeHtml(c.regulation)}</textarea></div>
      <button class="btn btn-solid" id="save">Publicar regulamento</button>
    `;
    const save = form.querySelector("#save");
    save.onclick = async () => {
      const deadline = document.getElementById("dl").value.trim();
      if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        alert("Prazo no formato AAAA-MM-DD, por exemplo 2026-12-15.");
        return;
      }
      const ok = await run(save, () => CGC.upsertContest({
        ...c,
        title: document.getElementById("t").value.trim(),
        category: document.getElementById("cat").value.trim(),
        status: document.getElementById("st").value,
        deadline: deadline || null,
        excerpt: document.getElementById("ex").value.trim(),
        regulation: document.getElementById("rg").value,
      }));
      if (ok) contests();
    };
    form.scrollIntoView({ behavior: "smooth" });
  }

  async function settings() {
    const s = CGC.settings();
    const email = await CGC.currentEmail();
    const legacy = CGC.legacyData();
    view.innerHTML = `
      <h1>Configurações</h1>
      <div class="field"><span>Instagram (URL)</span><input id="ig" value="${CGCUI.escapeHtml(s.instagram)}" /></div>
      <div class="field"><span>Handle</span><input id="igh" value="${CGCUI.escapeHtml(s.instagramHandle)}" /></div>
      <div class="field"><span>YouTube</span><input id="yt" value="${CGCUI.escapeHtml(s.youtube)}" /></div>
      <div class="field"><span>WhatsApp (DDI+DDD+número, só dígitos)</span><input id="wa" value="${CGCUI.escapeHtml(s.whatsapp)}" /></div>
      <div class="field"><span>E-mail</span><input id="em" value="${CGCUI.escapeHtml(s.email)}" /></div>
      <div class="field"><span>Cidade (barra do topo)</span><input id="ct" value="${CGCUI.escapeHtml(s.city)}" /></div>
      <button class="btn btn-solid" id="save-s">Salvar canais</button>
      <h2 style="font-family:var(--display);margin-top:40px">Acesso da redação</h2>
      <p>Conectada como <strong>${CGCUI.escapeHtml(email)}</strong>. Novas pessoas da redação são cadastradas no painel do Supabase.</p>
      <div class="field"><span>Nova senha (mínimo 6 caracteres)</span><input id="pw" type="password" autocomplete="new-password" /></div>
      <button class="btn btn-ghost light" id="save-a">Trocar senha</button>
      <h2 style="font-family:var(--display);margin-top:40px">Backup do acervo</h2>
      ${legacy ? `<p class="warn">Este navegador tem dados salvos pela versão antiga do admin (${legacy.books.length} livros, ${legacy.contests.length} editais).
         <button class="btn btn-ghost light" id="mig">Enviar esses dados para o site</button></p>` : ""}
      <p><button class="btn btn-ghost light" id="exp">Exportar JSON</button>
         <label class="btn btn-ghost light">Importar JSON<input type="file" id="imp" accept="application/json" hidden /></label>
         <button class="btn btn-ghost light" id="rst">Restaurar catálogo inicial</button></p>
    `;
    const saveS = document.getElementById("save-s");
    saveS.onclick = async () => {
      const ok = await run(saveS, () => CGC.updateSettings({
        instagram: document.getElementById("ig").value.trim(),
        instagramHandle: document.getElementById("igh").value.trim(),
        youtube: document.getElementById("yt").value.trim(),
        whatsapp: document.getElementById("wa").value.trim(),
        email: document.getElementById("em").value.trim(),
        city: document.getElementById("ct").value.trim(),
      }));
      if (ok) alert("Canais atualizados.");
    };
    const saveA = document.getElementById("save-a");
    saveA.onclick = async () => {
      const pw = document.getElementById("pw").value;
      if (pw.length < 6) return alert("A senha precisa ter pelo menos 6 caracteres.");
      if (await run(saveA, () => CGC.changePassword(pw))) alert("Senha trocada.");
    };
    const mig = document.getElementById("mig");
    if (mig) {
      mig.onclick = async () => {
        if (!confirm("Isso substitui o acervo publicado pelos dados deste navegador. Continuar?")) return;
        if (await run(mig, () => CGC.replaceAll(legacy))) {
          CGC.clearLegacy();
          alert("Dados enviados.");
          show("dash");
        }
      };
    }
    document.getElementById("exp").onclick = () => {
      const blob = new Blob([CGC.exportJSON()], { type: "application/json" });
      const ael = document.createElement("a");
      ael.href = URL.createObjectURL(blob);
      ael.download = "cria-gueto-cria-acervo.json";
      ael.click();
    };
    document.getElementById("imp").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (!confirm("Isso substitui todo o acervo publicado pelo conteúdo do arquivo. Continuar?")) return;
        if (await run(null, () => CGC.importJSON(reader.result))) {
          alert("Acervo importado.");
          show("dash");
        }
      };
      reader.readAsText(file);
    };
    const rst = document.getElementById("rst");
    rst.onclick = async () => {
      if (confirm("Isso apaga o acervo publicado e volta ao catálogo de demonstração.") && (await run(rst, () => CGC.reset()))) {
        show("dash");
      }
    };
  }

  function enter() {
    login.hidden = true;
    shell.hidden = false;
    show("dash");
  }

  loginBtn.onclick = async () => {
    const u = document.getElementById("user").value;
    const p = document.getElementById("pass").value;
    loginBtn.disabled = true;
    err.textContent = "";
    try {
      if (await CGC.login(u, p)) enter();
      else err.textContent = "E-mail ou senha inválidos, ou conta sem acesso à redação.";
    } catch (e) {
      err.textContent = e.message;
    } finally {
      loginBtn.disabled = false;
    }
  };
  document.getElementById("pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });
  document.querySelectorAll(".linkish").forEach((b) => {
    b.onclick = async () => {
      if (b.dataset.view === "out") {
        await CGC.logout();
        location.href = "index.html";
        return;
      }
      show(b.dataset.view);
    };
  });

  CGC.ready().then(async () => {
    if (!CGC.configured) {
      err.textContent = "Supabase não configurado: preencha js/config.js.";
      loginBtn.disabled = true;
      return;
    }
    if (await CGC.isAdmin()) enter();
  });
})();
