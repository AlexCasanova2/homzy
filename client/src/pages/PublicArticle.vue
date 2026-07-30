<template>
  <div class="reading-progress-container">
    <div class="reading-progress-bar" :style="{ width: readingProgress + '%' }"></div>
  </div>

  <section class="section article-hero-section reveal">
    <div v-if="loading" class="container article-state" aria-live="polite">
      <div class="spinner"></div>
      <h1>Cargando análisis...</h1>
    </div>
    <div v-else-if="notFound" class="container article-state">
      <h1>Análisis no encontrado</h1>
      <p>El artículo puede haberse movido o ya no estar disponible.</p>
      <RouterLink to="/" class="primary">Volver al inicio</RouterLink>
    </div>
    <div v-else-if="error" class="container article-state">
      <h1>No pudimos cargar el análisis</h1>
      <p>{{ error }}</p>
      <button class="secondary" @click="loadArticle(route.params.slug)">Reintentar</button>
    </div>
    <template v-else-if="article">
    <div class="container">
      <nav class="breadcrumbs">
        <RouterLink to="/">Inicio</RouterLink>
        <template v-for="crumb in breadcrumb" :key="crumb.id">
          <ChevronRightIcon :size="14" />
          <RouterLink :to="`/categoria/${crumb.slug}`">{{ crumb.name }}</RouterLink>
        </template>
        <template v-if="!breadcrumb.length">
          <ChevronRightIcon :size="14" />
          <span>Análisis</span>
        </template>
      </nav>

      <header class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <p class="article-subtitle">{{ article?.meta_description }}</p>

        <div class="article-meta-row">
          <div class="meta-item">
            <CalendarIcon :size="16" />
            <span>{{ formatDate(article?.published_at || article?.created_at) }}</span>
          </div>
          <div class="meta-item">
            <ClockIcon :size="16" />
            <span>{{ readTime(article?.html) }} min de lectura</span>
          </div>
          <div v-if="categoryName(article?.category_id)" class="meta-item category-tag">
            <TagIcon :size="16" />
            <span>{{ categoryName(article?.category_id) }}</span>
          </div>
        </div>

        <p class="affiliate-disclosure">Como Afiliado de Amazon, podemos recibir una comisión por las compras realizadas a través de los enlaces de este análisis, sin coste adicional para ti.</p>
      </header>
      
      <div v-if="article?.image_url" class="article-featured-image">
        <img :src="article.image_url" :alt="article.title" />
      </div>
    </div>

    <div class="container">
      <main class="article-main">
        <nav v-if="toc.length >= 2" class="article-toc" aria-label="Índice de contenidos">
          <div class="article-toc__title"><ListIcon :size="16" /> En este análisis</div>
          <ol>
            <li v-for="item in toc" :key="item.id">
              <a :href="`#${item.id}`" @click.prevent="scrollToHeading(item.id)">{{ item.text }}</a>
            </li>
          </ol>
        </nav>
        <div ref="articleContent" class="article-content-v3" v-html="article.html" @click="trackAffiliateClick"></div>
      </main>

      <section v-if="relatedArticles.length" class="related-section reveal" aria-labelledby="related-heading">
        <div class="section-head">
          <span class="eyebrow">Sigue leyendo</span>
          <h3 id="related-heading">Análisis relacionados</h3>
          <p>Otros análisis que pueden interesarte antes de decidir</p>
        </div>
        <div class="grid grid-3">
          <RouterLink
            v-for="related in relatedArticles"
            :key="related.id"
            class="review-card"
            :to="`/analisis/${related.slug}`"
          >
            <div class="review-thumb">
              <img v-if="related.image_url" :src="related.image_url" class="thumb-image" :alt="related.title" loading="lazy" />
              <span class="review-pill">{{ categoryName(related.category_id) || "Análisis" }}</span>
            </div>
            <div class="review-body">
              <div class="review-meta">
                <span class="date">{{ formatDate(related.published_at || related.created_at) }}</span>
              </div>
              <h4>{{ related.title }}</h4>
              <p class="meta-desc">{{ related.meta_description || "Consulta nuestro análisis editorial de este producto." }}</p>
            </div>
          </RouterLink>
        </div>
      </section>

      <div class="cta-banner article-cta-banner reveal">
        <div class="cta-content">
          <h2>¿Te ha resultado útil?</h2>
          <p>Suscríbete y recibe nuevos análisis y guías honestas como esta en tu bandeja de entrada.</p>
          <form class="cta-form" @submit.prevent="handleSubscribe">
            <input type="email" v-model="email" placeholder="Escribe tu email aquí..." required />
            <button type="submit">Suscribirme</button>
          </form>
        </div>
      </div>
    </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, onUnmounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import api from "../api.js";
import { trackEvent } from "../track.js";
import { useToastStore } from "../stores/toast.js";
import { 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon, 
  TagIcon, 
  ListIcon,
} from "lucide-vue-next";

const route = useRoute();
const article = ref(null);
const articleContent = ref(null);
const categories = ref([]);
const loading = ref(true);
const notFound = ref(false);
const error = ref("");
const readingProgress = ref(0);
const toc = ref([]);
const relatedArticles = ref([]);
const email = ref("");
const toast = useToastStore();
let requestNumber = 0;

async function handleSubscribe() {
  if (!email.value) return;
  try {
    await api.post("/newsletter/subscribe", { email: email.value });
    toast.success("¡Gracias por suscribirte!");
    email.value = "";
  } catch (err) {
    toast.error("Error al suscribirse");
  }
}

const updateProgress = () => {
  const scrolled = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  readingProgress.value = height > 0 ? Math.min(100, (scrolled / height) * 100) : 0;
};

async function loadCategories() {
  const { data } = await api.get("/categories");
  categories.value = data;
}

function categoryName(id) {
  return categories.value.find((cat) => cat.id === id)?.name || "";
}

// Cadena de categorías del artículo, de la raíz a la hoja, para las migas de pan.
const breadcrumb = computed(() => {
  const byId = new Map(categories.value.map((cat) => [cat.id, cat]));
  const chain = [];
  const seen = new Set();
  let current = byId.get(article.value?.category_id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : null;
  }
  return chain;
});

function readTime(html = "") {
  const words = html ? html.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length : 0;
  return Math.max(5, Math.ceil(words / 180));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Va aparte de loadArticle: si falla, el artículo se sigue leyendo sin la sección.
// El guard de requestNumber evita que una navegación rápida pinte los relacionados del anterior.
async function loadRelated(articleId, requestId) {
  try {
    const { data } = await api.get(`/articles/${articleId}/related`, { params: { limit: 3 } });
    if (requestId === requestNumber) relatedArticles.value = data;
  } catch {
    if (requestId === requestNumber) relatedArticles.value = [];
  }
}

async function loadArticle(slug) {
  const currentRequest = ++requestNumber;
  clearMeta();
  article.value = null;
  toc.value = [];
  relatedArticles.value = [];
  loading.value = true;
  notFound.value = false;
  error.value = "";
  readingProgress.value = 0;
  try {
    const { data } = await api.get(`/articles/${slug}`);
    if (currentRequest !== requestNumber) return;
    article.value = data;
    updateMeta(data);
    trackEvent({ type: "view", path: route.fullPath, articleId: data.id, referrer: document.referrer || null });
    // El contenido solo se monta cuando loading pasa a false; hay que hacerlo antes del nextTick.
    loading.value = false;
    await nextTick();
    secureExternalLinks();
    enhanceContent();
    injectStructuredData();
    updateProgress();
    loadRelated(data.id, currentRequest);
  } catch (requestError) {
    if (currentRequest !== requestNumber) return;
    if (requestError.response?.status === 404) notFound.value = true;
    else error.value = requestError.response?.data?.error || "Comprueba tu conexión e inténtalo de nuevo.";
    document.title = notFound.value ? "Análisis no encontrado | Homzy" : "Error | Homzy";
  } finally {
    if (currentRequest === requestNumber) loading.value = false;
  }
}

function headingId(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "seccion";
}

function enhanceContent() {
  const rootEl = articleContent.value;
  if (!rootEl) return;

  // La cabecera ya muestra el título; un h1 duplicado dentro del contenido sobra (SEO y lectura).
  const contentH1 = rootEl.querySelector("h1");
  if (contentH1 && article.value?.title && contentH1.textContent.trim().toLowerCase() === article.value.title.trim().toLowerCase()) {
    contentH1.remove();
  }

  // Índice de contenidos a partir de los h2 del cuerpo (excluye el CTA de afiliado).
  const seen = new Map();
  toc.value = [...rootEl.querySelectorAll("h2")]
    .filter((heading) => heading.textContent.trim() && !heading.closest(".affiliate-cta"))
    .map((heading) => {
      let id = headingId(heading.textContent.trim());
      const count = seen.get(id) || 0;
      seen.set(id, count + 1);
      if (count) id = `${id}-${count + 1}`;
      heading.id = id;
      return { id, text: heading.textContent.trim() };
    });

  // Las tablas necesitan scroll horizontal propio en pantallas pequeñas.
  rootEl.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });
}

function scrollToHeading(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parsePriceEuro(price) {
  const match = String(price || "").replace(/\./g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

// Datos estructurados para rich results de Google (estrellas y FAQs en el buscador).
function injectStructuredData() {
  const art = article.value;
  if (!art) return;
  const blocks = [];

  if (art.product) {
    const price = parsePriceEuro(art.product.price);
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: art.product.title,
      image: (art.product.images?.length ? art.product.images : [art.image_url]).filter(Boolean).slice(0, 5),
      ...(art.meta_description ? { description: art.meta_description } : {}),
      ...(art.product.rating && art.product.reviews
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: art.product.rating, reviewCount: art.product.reviews, bestRating: 5 } }
        : {}),
      ...(price
        ? { offers: { "@type": "Offer", price, priceCurrency: "EUR", availability: "https://schema.org/InStock", url: window.location.href } }
        : {}),
    });
  }

  const rootEl = articleContent.value;
  if (rootEl) {
    const faqHeading = [...rootEl.querySelectorAll("h2")].find((h) => /preguntas frecuentes|faq/i.test(h.textContent));
    const sectionEl = faqHeading?.closest("section") || faqHeading?.parentElement;
    if (sectionEl) {
      const items = [...sectionEl.querySelectorAll("h3")]
        .map((h3) => {
          let answer = "";
          let node = h3.nextElementSibling;
          while (node && node.tagName === "P") {
            answer += ` ${node.textContent}`;
            node = node.nextElementSibling;
          }
          return { q: h3.textContent.trim(), a: answer.trim() };
        })
        .filter((item) => item.q && item.a);
      if (items.length >= 2) {
        blocks.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        });
      }
    }
  }

  blocks.forEach((data) => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(data);
    el.dataset.homzyArticleMeta = "true";
    document.head.appendChild(el);
  });
}

function secureExternalLinks() {
  articleContent.value?.querySelectorAll("a[href]").forEach((link) => {
    try {
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) {
        link.target = "_blank";
        const rel = new Set((link.rel || "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        link.rel = [...rel].join(" ");
      }
    } catch {
      // Ignore malformed links retained in legacy content.
    }
  });
}

function isAffiliateLink(link) {
  const rel = new Set((link.rel || "").split(/\s+/));
  try {
    const host = new URL(link.href, window.location.href).hostname;
    return link.classList.contains("btn-buy") || rel.has("sponsored") || /(^|\.)amazon\.[a-z.]+$/i.test(host) || /(^|\.)amzn\.to$/i.test(host);
  } catch {
    return false;
  }
}

function trackAffiliateClick(event) {
  const link = event.target.closest("a[href]");
  if (!link || !articleContent.value?.contains(link) || !isAffiliateLink(link)) return;
  const affiliateLinks = [...articleContent.value.querySelectorAll("a[href]")].filter(isAffiliateLink);
  const clickContext = link.closest("table") ? "comparison_table" : link.classList.contains("btn-buy") ? "cta" : "article_body";
  trackEvent({ type: "affiliate_click", path: route.fullPath, articleId: article.value.id, context: clickContext });
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "affiliate_click", {
    article_id: article.value.id,
    article_slug: article.value.slug,
    cta_text: link.textContent.trim(),
    destination: link.href,
    position: affiliateLinks.indexOf(link) + 1,
    context: link.closest("table") ? "comparison_table" : link.classList.contains("btn-buy") ? "cta" : "article_body",
  });
}

function updateMeta(art) {
  if (!art) return;
  const title = art.seo_title || `${art.title} | Homzy`;
  const description = art.meta_description || "";
  const canonical = art.canonical_url || window.location.href;
  document.title = title;

  addMeta("name", "description", description);
  if (art.seo_keywords) addMeta("name", "keywords", art.seo_keywords);
  addMeta("property", "og:title", title);
  addMeta("property", "og:description", description);
  addMeta("property", "og:type", "article");
  addMeta("property", "og:url", canonical);
  if (art.image_url) addMeta("property", "og:image", art.image_url);
  addMeta("name", "twitter:card", art.image_url ? "summary_large_image" : "summary");
  addMeta("name", "twitter:title", title);
  addMeta("name", "twitter:description", description);
  if (art.image_url) addMeta("name", "twitter:image", art.image_url);

  const canon = document.createElement("link");
  canon.rel = "canonical";
  canon.href = canonical;
  canon.dataset.homzyArticleMeta = "true";
  document.head.appendChild(canon);
}

function addMeta(attribute, key, content) {
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  element.content = content;
  element.dataset.homzyArticleMeta = "true";
  document.head.appendChild(element);
}

function clearMeta() {
  document.querySelectorAll('[data-homzy-article-meta="true"]').forEach((element) => element.remove());
  document.title = "Homzy";
}

watch(() => route.params.slug, (slug) => {
  if (slug) loadArticle(slug);
}, { immediate: true });

onMounted(() => {
  window.addEventListener('scroll', updateProgress);
  loadCategories().catch(() => {});
});

onUnmounted(() => {
  requestNumber += 1;
  window.removeEventListener('scroll', updateProgress);
  clearMeta();
});
</script>

<style scoped>
.article-state { min-height: 55vh; display: grid; place-items: center; align-content: center; gap: 16px; text-align: center; }
.article-cta-banner { margin: 48px 0 40px; }

.related-section {
  margin-top: 64px;
  padding-top: 48px;
  border-top: 1px solid var(--border);
}

.related-section :deep(.section-head) { margin-bottom: 28px; }
.related-section :deep(.review-card h4) { font-size: 17px; }

/* Una sola columna al ancho completo del contenedor, como el resto de bloques */
.article-main { width: 100%; }
.article-main :deep(.article-content-v3),
.article-main :deep(.article-toc) { max-width: none; }

.affiliate-disclosure {
  max-width: 720px;
  margin: 14px auto 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
  opacity: 0.85;
}
@media (max-width: 640px) { .affiliate-disclosure { text-align: left; } }
</style>
