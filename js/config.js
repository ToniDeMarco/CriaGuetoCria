// Dados do projeto Supabase (Project Settings > API).
// A chave "anon" é pública por natureza: quem protege o acervo são as regras do banco (supabase/schema.sql).
// Enquanto estiver vazio, o site mostra o catálogo inicial de js/seed.js e o admin fica bloqueado.
window.CGC_CONFIG = {
  supabaseUrl: "https://bgwjnjauvtwvcwzzmemj.supabase.co",
  supabaseAnonKey: "sb_publishable_HUejrNr6OyyluSrb5f2xrw_wO-Z1WCb",

  // Medição e anúncios (tráfego pago). Deixe vazio o que não usar: nada é carregado
  // e o aviso de cookies nem aparece. Os scripts só entram depois que a visitante aceita.
  analytics: {
    ga4: "", // Google Analytics 4, ex.: "G-XXXXXXXXXX"
    googleAds: "", // Google Ads, ex.: "AW-123456789"
    // Rótulos de conversão do Google Ads (Metas > Conversões), ex.: "AW-123456789/AbCdEf"
    adsConversions: { whatsapp: "", leitura: "" },
    metaPixel: "", // Pixel da Meta (Facebook/Instagram), ex.: "123456789012345"
  },
};
