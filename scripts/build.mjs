// Build de publicação: gera a pasta dist/ que vai para o ar (Netlify ou Vercel rodam isto sozinhos).
//
// O que ele faz, além de copiar o site:
//  1. Busca o acervo no Supabase e já escreve no HTML o cabeçalho, o rodapé, os livros e os editais.
//     Robôs de busca e de IA (ChatGPT, Claude, Perplexity...) em geral não rodam JavaScript:
//     sem isso, eles veriam as páginas vazias. No navegador, o JavaScript refaz tudo com os dados ao vivo.
//  2. Coloca inline o CSS da primeira tela de cada página e carrega o resto sem bloquear a renderização.
//  3. Acrescenta canonical, Open Graph e dados estruturados (JSON-LD: editora, livros, editais).
//  4. Gera sitemap.xml, robots.txt e llms.txt (resumo do site e do catálogo para assistentes de IA).
//  5. Minifica o CSS e regenera as imagens WebP se algum original em assets/originais/ mudou.
//
// Endereço do site: variável SITE_URL (ex.: https://criaguetocria.com.br). Na Netlify e na Vercel
// ele é detectado sozinho; para usar um domínio próprio, defina SITE_URL no painel da hospedagem.
import { readFile, writeFile, readdir, rm, cp, mkdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import vm from "node:vm";

const OUT = "dist";
const PAGES = ["index.html", "biblioteca.html", "concursos.html", "concurso.html", "sobre.html", "contato.html"];
// Fora do site publicado: fontes de trabalho, originais em alta e arquivos de configuração.
const SKIP = new Set([
  "node_modules", "dist", ".git", ".gitignore", ".claude", "scripts", "supabase", "assets/originais",
  "assets/sankofa.png", "assets/adinkra.png", "referencia_Africa.jpg",
  "package.json", "package-lock.json", "netlify.toml", "vercel.json", "README.md",
]);

const SITE = (
  process.env.SITE_URL ||
  process.env.URL || // Netlify
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "")
).replace(/\/+$/, "");
const abs = (path = "") => SITE + "/" + path;

// ---------------------------------------------------------------- dados

// Roda os mesmos scripts do site (config, seed, store, ui) num contexto isolado,
// para o HTML gerado aqui ser idêntico ao que o navegador monta.
async function loadSite() {
  const ctx = { fetch, console, URLSearchParams, Date, JSON, Math, Promise };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ["js/config.js", "js/seed.js", "js/store.js", "js/ui.js"]) {
    vm.runInContext(await readFile(f, "utf8"), ctx, { filename: f });
  }
  await ctx.CGC.ready();
  if (ctx.CGC.source !== "supabase") {
    console.warn(`! Acervo do Supabase indisponível (${ctx.CGC.source}${ctx.CGC.error ? ": " + ctx.CGC.error : ""}); usando o catálogo inicial.`);
  }
  return { CGC: ctx.CGC, UI: ctx.CGCUI };
}

// ---------------------------------------------------------------- CSS

// Lê o CSS em blocos de primeiro nível: regras, @media/@supports (com filhos) e blocos fechados
// (@font-face, @keyframes). Comentários saem; strings ficam intactas.
function stripComments(css) {
  let out = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const j = css.indexOf(c, i + 1);
      out += css.slice(i, j + 1);
      i = j;
    } else if (c === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
    } else out += c;
  }
  return out;
}

function parseCss(css) {
  const nodes = [];
  let i = 0;
  while (i < css.length) {
    let j = i;
    let quote = null;
    while (j < css.length) {
      const c = css[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "{" || c === ";") break;
      j++;
    }
    const prelude = css.slice(i, j).trim();
    if (j >= css.length) break;
    if (css[j] === ";") {
      if (prelude) nodes.push({ type: "stmt", raw: prelude + ";" });
      i = j + 1;
      continue;
    }
    let depth = 1;
    let k = j + 1;
    quote = null;
    for (; k < css.length && depth; k++) {
      const c = css[k];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
    }
    const body = css.slice(j + 1, k - 1);
    if (/^@(media|supports)/.test(prelude)) nodes.push({ type: "group", prelude, children: parseCss(body) });
    else if (prelude.startsWith("@")) nodes.push({ type: "block", prelude, body });
    else nodes.push({ type: "rule", selector: prelude, body });
    i = k;
  }
  return nodes;
}

function splitTop(str, ch) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const c of str) {
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (c === ch && !depth) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  return parts;
}

// Um seletor entra no CSS crítico se todas as classes, ids e tags dele aparecem na primeira tela.
function selectorUsed(selector, used) {
  return splitTop(selector, ",").some((sel) => {
    const plain = sel
      .replace(/::?[\w-]+(\((?:[^()]|\([^()]*\))*\))?/g, "") // pseudo-classes e pseudo-elementos
      .replace(/\[[^\]]*\]/g, ""); // atributos
    const classes = plain.match(/\.[\w-]+/g) || [];
    const ids = plain.match(/#[\w-]+/g) || [];
    const tags = plain.match(/(^|[\s>+~])([a-z][a-z0-9]*)/g) || [];
    return (
      classes.every((c) => used.classes.has(c.slice(1))) &&
      ids.every((id) => used.ids.has(id.slice(1))) &&
      tags.every((t) => used.tags.has(t.trim().replace(/^[>+~]/, "")))
    );
  });
}

function pickCritical(nodes, used) {
  const out = [];
  for (const n of nodes) {
    if (n.type === "rule" && selectorUsed(n.selector, used)) out.push(n);
    else if (n.type === "group") {
      const children = pickCritical(n.children, used);
      if (children.length) out.push({ ...n, children });
    } else if (n.type === "block" && n.prelude.startsWith("@font-face")) out.push(n);
    else if (n.type === "block" && n.prelude.startsWith("@keyframes")) out.push(n); // filtrado abaixo
  }
  return out;
}

function serialize(nodes) {
  return nodes
    .map((n) => {
      if (n.type === "stmt") return n.raw;
      if (n.type === "group") return n.prelude + "{" + serialize(n.children) + "}";
      if (n.type === "block") return n.prelude + "{" + n.body + "}";
      return n.selector + "{" + n.body + "}";
    })
    .join("");
}

// Minificação conservadora: só espaços e quebras de linha (fora de strings).
function minifyCss(css) {
  let out = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const j = css.indexOf(c, i + 1);
      out += css.slice(i, j + 1);
      i = j;
    } else if (/\s/.test(c)) {
      while (/\s/.test(css[i + 1] || "")) i++;
      const prev = out[out.length - 1];
      const next = css[i + 1];
      if (!"{};,>".includes(prev) && !"{};,>".includes(next) && out.length) out += " ";
    } else out += c;
  }
  return out.replace(/;}/g, "}");
}

// Classes que entram depois pelo JavaScript e afetam a primeira tela.
const SAFE_CLASSES = [
  "preloader", "preloader-inner", "preloader-mark", "preloader-name", "preloader-pct", "preloader-caption",
  "preloader-bar", "is-preloading", "is-done", "is-leaving", "is-open", "is-active", "has-image", "book-cover-img",
];

function usedIn(html) {
  const used = { classes: new Set(SAFE_CLASSES), ids: new Set(), tags: new Set(["html", "body", "svg", "path", "image"]) };
  for (const m of html.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach((c) => c && used.classes.add(c));
  for (const m of html.matchAll(/id="([^"]*)"/g)) used.ids.add(m[1]);
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)/g)) used.tags.add(m[1]);
  return used;
}

function criticalCss(tree, html) {
  const cut = html.indexOf("<!-- /critico");
  const used = usedIn(cut > 0 ? html.slice(0, cut) : html);
  let nodes = pickCritical(tree, used);
  const text = serialize(nodes.filter((n) => !(n.type === "block" && n.prelude.startsWith("@keyframes"))));
  const keep = (n) => n.type !== "block" || !n.prelude.startsWith("@keyframes") || text.includes(n.prelude.split(/\s+/)[1]);
  nodes = nodes.filter(keep);
  // o CSS inline fica na raiz do site, não em css/
  return minifyCss(serialize(nodes)).replace(/url\((["']?)\.\.\//g, "url($1");
}

// ---------------------------------------------------------------- SEO

const PAGE_TYPE = {
  "index.html": "WebPage",
  "biblioteca.html": "CollectionPage",
  "concursos.html": "CollectionPage",
  "concurso.html": "WebPage",
  "sobre.html": "AboutPage",
  "contato.html": "ContactPage",
};
const PAGE_NAME = {
  "biblioteca.html": "Biblioteca",
  "concursos.html": "Concursos",
  "concurso.html": "Regulamento",
  "sobre.html": "A editora",
  "contato.html": "Contato",
};

function meta(html, name) {
  const m = html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`));
  return m ? m[1] : "";
}

function jsonLd(file, html, { CGC, UI }) {
  const s = CGC.settings();
  const org = {
    "@type": "Organization",
    "@id": abs("#editora"),
    name: s.name,
    url: abs(),
    logo: abs("assets/img/apple-touch-icon.png"),
    image: abs("assets/img/og-cria-gueto-cria.jpg"),
    slogan: s.tagline,
    description: s.tagline + ". Biblioteca digital, concursos literários e quatro linhas editoriais: Raízes, Travessias, Ancestralidade e Vivências.",
    email: s.email,
    address: { "@type": "PostalAddress", addressLocality: String(s.city).split(/\s+—\s+/)[0], addressCountry: "BR" },
    sameAs: [s.instagram, s.youtube].filter(Boolean),
    contactPoint: { "@type": "ContactPoint", contactType: "atendimento", telephone: "+" + s.whatsapp, availableLanguage: "pt-BR" },
    knowsAbout: ["literatura negra", "autoras negras", "literatura brasileira contemporânea", "concursos literários", "poesia", "romance", "ensaio"],
  };
  const site = {
    "@type": "WebSite",
    "@id": abs("#site"),
    url: abs(),
    name: s.name,
    inLanguage: "pt-BR",
    publisher: { "@id": org["@id"] },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: abs("biblioteca.html?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  };
  const url = file === "index.html" ? abs() : abs(file);
  const page = {
    "@type": PAGE_TYPE[file],
    "@id": url + "#pagina",
    url,
    name: html.match(/<title>([^<]*)<\/title>/)[1],
    description: meta(html, "description"),
    inLanguage: "pt-BR",
    isPartOf: { "@id": site["@id"] },
    about: { "@id": org["@id"] },
  };
  if (PAGE_NAME[file]) {
    page.breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: abs() },
        { "@type": "ListItem", position: 2, name: PAGE_NAME[file], item: url },
      ],
    };
  }
  if (file === "biblioteca.html") {
    page.mainEntity = {
      "@type": "ItemList",
      numberOfItems: CGC.books().length,
      itemListElement: CGC.books().map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Book",
          name: b.title,
          url: abs("biblioteca.html?livro=" + encodeURIComponent(b.id)),
          author: { "@type": "Person", name: b.author },
          datePublished: b.year ? String(b.year) : undefined,
          genre: b.genre,
          about: b.territory,
          numberOfPages: b.pages || undefined,
          isbn: b.isbn || undefined,
          description: b.synopsis || undefined,
          image: b.coverUrl ? CGC.coverImage(b.coverUrl) : undefined,
          inLanguage: "pt-BR",
          publisher: { "@id": org["@id"] },
        },
      })),
    };
  }
  if (file === "concursos.html") {
    page.mainEntity = {
      "@type": "ItemList",
      itemListElement: CGC.contests().map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "CreativeWork",
          name: c.title,
          url: abs("concurso.html?id=" + encodeURIComponent(c.id)),
          abstract: c.excerpt,
          genre: c.category,
          datePublished: c.publishedAt || undefined,
          expires: c.deadline || undefined,
          creativeWorkStatus: UI.statusLabel(CGC.statusOf(c)),
          publisher: { "@id": org["@id"] },
        },
      })),
    };
  }
  const graph = { "@context": "https://schema.org", "@graph": [org, site, page] };
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

function seoTags(file, html, site) {
  const url = file === "index.html" ? abs() : abs(file);
  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${abs("assets/img/og-cria-gueto-cria.jpg")}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Cria Gueto Cria: livros de mulheres negras para mulheres negras" />`,
    `<meta name="twitter:image" content="${abs("assets/img/og-cria-gueto-cria.jpg")}" />`,
    `<script type="application/ld+json">${jsonLd(file, html, site)}</script>`,
  ].join("\n  ");
}

// ---------------------------------------------------------------- páginas

function fill(html, id, inner) {
  const re = new RegExp(`(<(\\w+)[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</\\2>)`);
  return html.replace(re, (m, open, tag, close) => open + inner + close);
}

function prerender(file, html, { CGC, UI }) {
  const s = CGC.settings();
  const pageKey = (html.match(/mountChrome\("(\w+)"\)/) || [])[1] || "home";
  const books = CGC.books();
  const contests = CGC.contests();
  const open = contests.filter((c) => CGC.statusOf(c) !== "encerrado").length;

  html = html.replace('<div id="site-chrome"></div>', `<div id="site-chrome">${UI.headerHTML(pageKey, s)}</div>`);
  html = html.replace('  <script src="js/config.js"></script>', UI.footerHTML(s) + '\n  <script src="js/config.js"></script>');
  html = html.replace(/(<(\w+)[^>]*data-book-count[^>]*>)[^<]*(<\/\2>)/g, `$1${books.length}$3`);
  html = html.replace(/(<(\w+)[^>]*data-open-contests[^>]*>)[^<]*(<\/\2>)/g, `$1${open}$3`);

  if (file === "index.html") {
    html = fill(html, "featured-books", books.slice(0, 5).map((b, i) => UI.bookCard(b, i)).join(""));
    html = fill(html, "home-contests", contests.map((c) => UI.contestCard(c)).join(""));
  }
  if (file === "biblioteca.html") {
    html = fill(html, "shelf", books.map((b, i) => UI.bookCard(b, i)).join(""));
    html = fill(html, "count", `${books.length} título${books.length === 1 ? "" : "s"} no recorte`);
  }
  if (file === "concursos.html") {
    const list = contests.slice().sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
    html = fill(html, "list", list.map((c) => UI.contestCard(c, true)).join("") || "<p>Nenhum edital publicado ainda.</p>");
  }
  if (file === "contato.html") html = fill(html, "cards", UI.contactCards(s));
  return html;
}

// ---------------------------------------------------------------- arquivos do site

function sitemap({ CGC }) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ["", "biblioteca.html", "concursos.html", "sobre.html", "contato.html"].map((p) => abs(p));
  CGC.contests().forEach((c) => urls.push(abs("concurso.html?id=" + encodeURIComponent(c.id))));
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u.replace(/&/g, "&amp;")}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
    "\n</urlset>\n"
  );
}

function robots() {
  return [
    "# Buscadores e assistentes de IA são bem-vindos em todo o site, menos na área da redação.",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin.html",
    "",
    SITE ? `Sitemap: ${abs("sitemap.xml")}` : "",
    "",
  ].join("\n");
}

// Resumo em Markdown para assistentes de IA (padrão llms.txt): quem é a editora, páginas,
// catálogo completo e editais. Fica em /llms.txt.
function llms({ CGC, UI }) {
  const s = CGC.settings();
  const link = (p) => (SITE ? abs(p) : p || "index.html");
  const books = CGC.books();
  const lines = [
    `# ${s.name}`,
    "",
    `> ${s.tagline}. Editora independente de literatura negra escrita por mulheres, com sede em ${s.city}. ` +
      "Publica poesia, romance, ensaio, contos, memória, infantojuvenil e teatro; mantém uma biblioteca digital " +
      "com o acervo da casa e concursos literários com regulamento público.",
    "",
    "A Cria Gueto Cria nasce da certeza de que literatura negra escrita por mulheres não é nicho: é fundação. " +
      "O catálogo se organiza em quatro linhas editoriais, cada uma ligada a um símbolo Adinkra.",
    "",
    "## Páginas",
    "",
    `- [Início](${link("")}): apresentação da editora, destaques do catálogo e editais abertos.`,
    `- [Biblioteca digital](${link("biblioteca.html")}): acervo com ${books.length} títulos, busca por título, autora ou ISBN.`,
    `- [Concursos literários](${link("concursos.html")}): editais e regulamentos oficiais.`,
    `- [A editora](${link("sobre.html")}): manifesto e linhas editoriais.`,
    `- [Contato](${link("contato.html")}): WhatsApp, Instagram e YouTube.`,
    "",
    "## Linhas editoriais",
    "",
    "- Raízes (Sankofa: voltar e buscar)",
    "- Travessias (Nkyinkyim: as voltas da jornada)",
    "- Ancestralidade (Adinkrahene: grandeza e liderança)",
    "- Vivências (Aya: resistência e engenho)",
    "",
    "## Concursos literários",
    "",
    ...CGC.contests().map(
      (c) =>
        `- [${c.title}](${link("concurso.html?id=" + encodeURIComponent(c.id))}): ${UI.statusLabel(CGC.statusOf(c))}, ` +
        `${c.category}, prazo ${UI.formatDate(c.deadline)}. ${c.excerpt}`
    ),
    "",
    `## Catálogo (${books.length} títulos)`,
    "",
    ...books.map(
      (b) => `- *${b.title}*, de ${b.author} (${b.year}). ${b.genre} · linha ${b.territory}.${b.synopsis ? " " + b.synopsis : ""}`
    ),
    "",
    "## Contato",
    "",
    `- WhatsApp: +${s.whatsapp}`,
    `- Instagram: ${s.instagram}`,
    `- YouTube: ${s.youtube}`,
    `- E-mail: ${s.email}`,
    "",
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------- execução

const started = Date.now();
if (!SITE) console.warn("! SITE_URL não definido: canonical, og:url, og:image e sitemap ficam de fora.");

// Esvazia dist/ sem apagar a pasta (no Windows ela fica travada se estiver aberta no Explorer).
await mkdir(OUT, { recursive: true });
for (const entry of await readdir(OUT)) await rm(join(OUT, entry), { recursive: true, force: true });
const keep = (src) => {
  const rel = relative(".", src).split(sep).join("/");
  return ![...SKIP].some((p) => rel === p || rel.startsWith(p + "/"));
};
for (const entry of await readdir(".")) {
  if (!keep(entry)) continue;
  // preserveTimestamps: para a checagem de imagens desatualizadas funcionar
  await cp(entry, join(OUT, entry), { recursive: true, preserveTimestamps: true, filter: keep });
}

// Imagens: regenera só se algum original for mais novo que a versão otimizada.
try {
  const { optimizeImages } = await import("./imagens.mjs");
  const n = await optimizeImages(join(OUT, "assets/img"));
  if (n) console.log(`· ${n} imagem(ns) regenerada(s) a partir de assets/originais/`);
} catch (e) {
  console.warn("! Imagens não regeneradas (" + e.message + "). Usando as de assets/img/.");
}

const site = await loadSite();
const css = stripComments(await readFile("css/styles.css", "utf8"));
const tree = parseCss(css);
await writeFile(join(OUT, "css/styles.css"), minifyCss(css));

for (const file of PAGES) {
  let html = await readFile(file, "utf8");
  html = prerender(file, html, site);
  if (SITE) html = html.replace(/ *<!-- O build \(npm run build\)[^>]*-->/, "  " + seoTags(file, html, site));
  else html = html.replace(/ *<!-- O build \(npm run build\)[^>]*-->\n/, "");
  const critical = criticalCss(tree, html);
  html = html.replace(
    '<link rel="stylesheet" href="css/styles.css" />',
    `<style>${critical}</style>\n  <link rel="preload" href="css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />\n  <noscript><link rel="stylesheet" href="css/styles.css" /></noscript>`
  );
  html = html.replace(/ *<!-- \/critico[^>]*-->\n/, "");
  if (/<script[^>]+src="https?:/.test(html)) throw new Error(file + " ainda carrega script externo.");
  await writeFile(join(OUT, file), html);
  console.log(`· ${file}: CSS crítico ${(critical.length / 1024).toFixed(1)} KB`);
}

await writeFile(join(OUT, "robots.txt"), robots());
await writeFile(join(OUT, "llms.txt"), llms(site));
if (SITE) await writeFile(join(OUT, "sitemap.xml"), sitemap(site));

console.log(`✓ dist/ pronto em ${((Date.now() - started) / 1000).toFixed(1)}s (${site.CGC.books().length} livros, ${site.CGC.contests().length} editais, fonte: ${site.CGC.source})`);
