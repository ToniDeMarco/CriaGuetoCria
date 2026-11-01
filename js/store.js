(function (global) {
  // Dados antigos, de quando a redação salvava só no navegador (usados na migração).
  const LEGACY_KEY = "cgc.store.v1";

  const cfg = global.CGC_CONFIG || {};
  const db = cfg.supabaseUrl && cfg.supabaseAnonKey && global.supabase
    ? global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  // Colunas de cada tabela, em camelCase; no banco ficam em snake_case (driveUrl -> drive_url).
  const COLS = {
    books: ["id", "title", "author", "year", "genre", "territory", "pages", "isbn", "driveUrl", "coverUrl", "synopsis"],
    contests: ["id", "title", "status", "category", "deadline", "publishedAt", "excerpt", "coverHue", "regulation"],
  };

  let data = null;
  let loading = null;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function snake(key) {
    return key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
  }

  function toRow(table, item) {
    const row = {};
    COLS[table].forEach((k) => {
      if (item[k] !== undefined) row[snake(k)] = item[k] === "" ? null : item[k];
    });
    return row;
  }

  function fromRow(table, row) {
    const item = {};
    COLS[table].forEach((k) => (item[k] = row[snake(k)]));
    return item;
  }

  // ID do arquivo num link do Drive (".../file/d/ID/view" ou "...?id=ID").
  function driveId(url) {
    const m = String(url || "").match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || String(url || "").match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function requireDb() {
    if (!db) throw new Error("Supabase não configurado. Preencha js/config.js.");
  }

  function check(result) {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }

  async function fetchAll() {
    if (!db) {
      data = clone(global.CGC_SEED);
      api.source = "seed";
      return;
    }
    try {
      const [s, b, c] = await Promise.all([
        db.from("settings").select("data").eq("id", 1).maybeSingle(),
        db.from("books").select("*").order("created_at", { ascending: false }).order("id"),
        db.from("contests").select("*").order("created_at", { ascending: false }).order("id"),
      ]);
      const row = check(s);
      data = {
        settings: { ...global.CGC_SEED.settings, ...(row && row.data) },
        books: check(b).map((r) => fromRow("books", r)),
        contests: check(c).map((r) => fromRow("contests", r)),
      };
      api.source = "supabase";
    } catch (e) {
      console.error("Falha ao carregar do Supabase:", e);
      data = clone(global.CGC_SEED);
      api.source = "erro";
      api.error = e.message;
    }
  }

  // Grava a lista inteira de uma tabela: insere/atualiza e depois apaga o que sobrou.
  async function replaceTable(table, items) {
    if (items.length) check(await db.from(table).upsert(items.map((x) => toRow(table, x))));
    const ids = items.map((x) => '"' + x.id + '"').join(",");
    const del = db.from(table).delete();
    check(await (ids ? del.not("id", "in", "(" + ids + ")") : del.neq("id", "")));
  }

  const api = {
    // "supabase", "seed" (sem config) ou "erro" (falhou e mostrou o catálogo inicial).
    source: null,
    error: null,
    configured: Boolean(db),
    ready() {
      if (!loading) loading = fetchAll();
      return loading;
    },
    get() {
      return data;
    },
    settings() {
      return data.settings;
    },
    async updateSettings(patch) {
      requireDb();
      const next = { ...data.settings, ...patch };
      check(await db.from("settings").upsert({ id: 1, data: next }));
      data.settings = next;
      return next;
    },
    books() {
      return data.books;
    },
    book(id) {
      return data.books.find((b) => b.id === id) || null;
    },
    async upsertBook(book) {
      requireDb();
      if (!book.id) book.id = uid("b");
      check(await db.from("books").upsert(toRow("books", book)));
      const i = data.books.findIndex((b) => b.id === book.id);
      if (i >= 0) data.books[i] = { ...data.books[i], ...book };
      else data.books.unshift(book);
      return book;
    },
    async deleteBook(id) {
      requireDb();
      check(await db.from("books").delete().eq("id", id));
      data.books = data.books.filter((b) => b.id !== id);
    },
    contests() {
      return data.contests;
    },
    contest(id) {
      return data.contests.find((c) => c.id === id) || null;
    },
    // Status exibido: edital "aberto" com prazo vencido aparece como encerrado,
    // sem alterar o status salvo (se a redação prorrogar o prazo, ele reabre).
    statusOf(c) {
      if (c.status !== "aberto" || !c.deadline) return c.status;
      const d = new Date();
      const today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      return c.deadline < today ? "encerrado" : c.status;
    },
    async upsertContest(item) {
      requireDb();
      if (!item.id) item.id = uid("c");
      if (!item.publishedAt) item.publishedAt = new Date().toISOString().slice(0, 10);
      check(await db.from("contests").upsert(toRow("contests", item)));
      const i = data.contests.findIndex((c) => c.id === item.id);
      if (i >= 0) data.contests[i] = { ...data.contests[i], ...item };
      else data.contests.unshift(item);
      return item;
    },
    async deleteContest(id) {
      requireDb();
      check(await db.from("contests").delete().eq("id", id));
      data.contests = data.contests.filter((c) => c.id !== id);
    },
    // Substitui todo o acervo (importar JSON, migrar ou restaurar o catálogo inicial).
    async replaceAll(next) {
      requireDb();
      if (!next || !next.books || !next.contests || !next.settings) throw new Error("Arquivo inválido.");
      await replaceTable("books", next.books);
      await replaceTable("contests", next.contests);
      check(await db.from("settings").upsert({ id: 1, data: next.settings }));
      data = { settings: next.settings, books: clone(next.books), contests: clone(next.contests) };
    },
    reset() {
      return api.replaceAll(clone(global.CGC_SEED));
    },
    exportJSON() {
      return JSON.stringify(data, null, 2);
    },
    importJSON(text) {
      return api.replaceAll(JSON.parse(text));
    },
    legacyData() {
      try {
        const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
        return parsed && parsed.books && parsed.contests && parsed.settings ? parsed : null;
      } catch (e) {
        return null;
      }
    },
    clearLegacy() {
      localStorage.removeItem(LEGACY_KEY);
    },
    async login(email, password) {
      requireDb();
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return false;
      if (await api.isAdmin()) return true;
      await db.auth.signOut();
      return false;
    },
    async logout() {
      if (db) await db.auth.signOut();
    },
    // Só conta como redação quem estiver logada e cadastrada na tabela "editors".
    async isAdmin() {
      if (!db) return false;
      const { data: s } = await db.auth.getSession();
      if (!s.session) return false;
      const { data: ok } = await db.rpc("is_editor");
      return ok === true;
    },
    async currentEmail() {
      if (!db) return "";
      const { data: s } = await db.auth.getSession();
      return (s.session && s.session.user.email) || "";
    },
    async changePassword(password) {
      requireDb();
      const { error } = await db.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    drivePreview(url) {
      if (!url) return "";
      const id = driveId(url);
      return id ? "https://drive.google.com/file/d/" + id + "/preview" : url;
    },
    // Endereço de imagem para a capa. Links do Drive viram miniatura (o arquivo precisa
    // estar compartilhado como "Qualquer pessoa com o link"); outros links passam direto.
    coverImage(url) {
      if (!url) return "";
      const id = driveId(url);
      return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000" : url;
    },
  };

  global.CGC = api;
})(window);
