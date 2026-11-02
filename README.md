# Cria Gueto Cria

Site da editora: HTML, CSS e JavaScript puros, com o acervo no Supabase.
O site abre direto no navegador (basta abrir `index.html`); o build só prepara a versão publicada.

## Publicar (Netlify ou Vercel)

Conecte o repositório. As configurações já estão em `netlify.toml` / `vercel.json`:

- comando de build: `npm run build`
- pasta publicada: `dist`
- variável `SITE_URL` (opcional): o endereço definitivo, ex. `https://criaguetocria.com.br`.
  Sem ela, o build usa o endereço da própria hospedagem.

O build (`scripts/build.mjs`):

- escreve no HTML o cabeçalho, o rodapé, os livros e os editais (para buscadores e IAs que não rodam JavaScript);
- coloca inline o CSS da primeira tela;
- gera canonical, Open Graph, dados estruturados (JSON-LD), `sitemap.xml`, `robots.txt` e `llms.txt`.

### Manter os buscadores em dia quando a redação publica

O conteúdo escrito no HTML é o do momento do build. Para refazer o build sozinho a cada livro ou edital salvo:

1. Netlify: *Site configuration > Build & deploy > Build hooks > Add build hook*. Copie a URL.
2. Supabase: *Database > Webhooks > Create a new hook*, nas tabelas `books`, `contests` e `settings`,
   eventos insert/update/delete, método POST, colando a URL do passo 1.

(Na Vercel: *Settings > Git > Deploy Hooks*.) Quem visita o site sempre vê os dados ao vivo, com ou sem isso.

## Trocar uma foto

1. Coloque o original (em alta) em `assets/originais/`, com o mesmo nome do arquivo antigo.
2. Rode `npm install` (só na primeira vez) e `npm run imagens`.

Isso gera as versões WebP em `assets/img/`, em várias larguras. O build também as regenera se esquecer.

## Anúncios e medição

Preencha os IDs em `js/config.js` (`analytics`): Google Analytics 4, Google Ads (e os rótulos de conversão) e Pixel da Meta.
Os scripts só carregam depois que a visitante aceita o aviso de cookies.

Conversões enviadas: clique no WhatsApp, abrir ficha de livro, "Ler na biblioteca" e abrir regulamento.

Links úteis para campanhas:

- `biblioteca.html?livro=ID`: abre direto a ficha de um livro;
- `biblioteca.html?q=termo`: abre a biblioteca já buscando.

## Rodar o build localmente

```
npm install
npm run build
npx serve dist
```
