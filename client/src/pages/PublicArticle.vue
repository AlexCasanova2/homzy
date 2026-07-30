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
        <ChevronRightIcon :size="14" />
        <span>{{ categoryName(article?.category_id) || "Análisis" }}</span>
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
      <div class="article-layout">
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
        <aside class="article-sidebar">
          <div class="side-card glass reveal" style="animation-delay: 0.1s">
            <div class="side-card__header">
              <UserIcon :size="18" />
              <h4>Sobre el autor</h4>
            </div>
            <div class="author-mini">
              <div class="avatar-large">H</div>
              <div class="author-info">
                <strong>Equipo Homzy</strong>
                <p>Equipo editorial especializado en investigar y comparar productos para el hogar.</p>
              </div>
            </div>
          </div>

          <div class="side-card glass reveal" style="animation-delay: 0.2s">
            <div class="side-card__header">
              <InfoIcon :size="18" />
              <h4>Ficha del Análisis</h4>
            </div>
            <div class="side-info-list">
              <div class="side-info-item">
                <span>Actualizado</span>
                <strong>{{ formatDate(article?.updated_at) }}</strong>
              </div>
              <div class="side-info-item">
                <span>Categoría</span>
                <strong>{{ categoryName(article?.category_id) }}</strong>
              </div>
              <div class="side-info-item">
                <span>Método</span>
                <strong>Investigación editorial</strong>
              </div>
            </div>
          </div>

          <div class="side-card bg-primary text-white reveal" style="animation-delay: 0.2s">
            <h4>¿Te ha gustado?</h4>
            <p>Suscríbete para recibir más guías honestas como esta directamente en tu correo.</p>
            <div class="newsletter-mini">
              <input type="email" v-model="email" placeholder="tu@email.com" />
              <button class="btn-white" @click="handleSubscribe">Unirme</button>
            </div>
          </div>

          <div class="side-card glass reveal" style="animation-delay: 0.3s">
            <h4>Navegación</h4>
            <RouterLink class="side-link" to="/">
              <ArrowLeftIcon :size="16" />
              Volver a todas las reseñas
            </RouterLink>
          </div>
        </aside>
      </div>
    </div>
    </template>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref, onUnmounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import api from "../api.js";
import { useToastStore } from "../stores/toast.js";
import { 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon, 
  TagIcon, 
  InfoIcon,
  ArrowLeftIcon,
  UserIcon,
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

async function loadArticle(slug) {
  const currentRequest = ++requestNumber;
  clearMeta();
  article.value = null;
  toc.value = [];
  loading.value = true;
  notFound.value = false;
  error.value = "";
  readingProgress.value = 0;
  try {
    const { data } = await api.get(`/articles/${slug}`);
    if (currentRequest !== requestNumber) return;
    article.value = data;
    updateMeta(data);
    // El contenido solo se monta cuando loading pasa a false; hay que hacerlo antes del nextTick.
    loading.value = false;
    await nextTick();
    secureExternalLinks();
    enhanceContent();
    updateProgress();
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
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "affiliate_click",
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
