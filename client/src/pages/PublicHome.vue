<template>
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>

  <section class="hero-main reveal">
    <div class="hero-bg-image" style="background-image: url('/hero.png')"></div>
    <div class="container hero-content">
      <h2 class="hero-title">
        Diseño y <span class="text-gradient">Tecnología</span> <br/> para tu Hogar
      </h2>
      <p class="hero-subtitle">Descubre análisis claros de productos que pueden mejorar tu espacio y tu día a día.</p>
      
      <form class="hero-search" role="search" @submit.prevent="submitSearch">
        <label class="sr-only" for="home-search">Buscar artículos</label>
        <input id="home-search" v-model="searchQuery" type="search" placeholder="¿Qué estás buscando hoy?" />
        <button class="search-btn" type="submit" aria-label="Buscar"><SearchIcon :size="20" /></button>
      </form>
    </div>
  </section>

  <!-- Featured Section -->
  <section v-if="featuredArticle" class="section reveal delay-1" style="padding-top: 0">
    <div class="container">
      <RouterLink class="featured-card glass card--hover" :to="`/analisis/${featuredArticle.slug}`">
        <div class="featured-badge">Nueva Reseña Destacada</div>
        <div class="featured-grid">
          <div class="featured-thumb" :style="getThumbStyle(featuredArticle.id)">
            <img v-if="featuredArticle.image_url" :src="featuredArticle.image_url" class="thumb-image" alt="Destacado" />
          </div>
          <div class="featured-info">
            <span class="category-chip">{{ categoryName(featuredArticle.category_id) || "Análisis Pro" }}</span>
            <h3>{{ featuredArticle.title }}</h3>
            <p>{{ featuredArticle.meta_description || "Consulta las características, ventajas y aspectos a considerar antes de elegir este producto." }}</p>
            <div class="featured-footer">
              <div class="user-meta">
                <div class="avatar-mini">H</div>
                <span>Por Equipo Homzy</span>
              </div>
              <span class="btn-primary-slim">Leer análisis completo</span>
            </div>
          </div>
        </div>
      </RouterLink>
    </div>
  </section>

  <section class="section reveal delay-2" id="categorias">
    <div class="container">
      <div class="section-head">
        <h3>Explora por Categoría</h3>
        <p>Análisis organizados para encontrar fácilmente lo que te interesa</p>
      </div>
      <div v-if="categories.length" class="category-row">
        <RouterLink v-for="(category, index) in categories" :key="category.id" :to="`/categoria/${category.slug}`"
             class="category-card glass reveal"
             :class="'delay-' + (index + 2)">
          <div class="category-icon">
            <component :is="getCategoryIcon(category.name)" :size="20" />
          </div>
          <h4>{{ category.name }}</h4>
          <span>{{ categoryCount(category.id) }} {{ categoryCount(category.id) === 1 ? "artículo" : "artículos" }}</span>
        </RouterLink>
      </div>
      <p v-else class="empty-note">Estamos organizando las categorías. Muy pronto podrás explorar los análisis por temática.</p>
    </div>
  </section>

  <section class="section reveal delay-4">
    <div class="container">
      <div class="section-head">
        <h3>Reseñas Recientes</h3>
        <p>Los últimos análisis publicados por nuestro equipo editorial</p>
      </div>
      <p v-if="!articlesToShow.length" class="empty-note">
        {{ articles.length ? "De momento este es nuestro único análisis publicado. Muy pronto habrá más reseñas." : "Aún no hay reseñas publicadas. Estamos preparando los primeros análisis: vuelve pronto." }}
      </p>
      <div v-else class="grid grid-3">
        <RouterLink
          v-for="(article, index) in articlesToShow"
          :key="article.id"
          class="review-card reveal"
          :class="'delay-' + ((index % 3) + 1)"
          :to="`/analisis/${article.slug}`"
        >
          <div class="review-thumb" :style="getThumbStyle(article.id)">
            <img v-if="article.image_url" :src="article.image_url" class="thumb-image" alt="Miniatura" />
            <span class="review-pill">{{ categoryName(article.category_id) || "Análisis" }}</span>
          </div>
          <div class="review-body">
            <div class="review-meta">
              <span class="date">{{ formatDate(article.published_at || article.created_at) }}</span>
            </div>
            <h4>{{ article.title }}</h4>
            <p class="meta-desc">{{ article.meta_description || "Consulta nuestro análisis editorial de este producto." }}</p>
            <div class="review-footer">
              <span class="editorial-label">Análisis editorial</span>
              <span class="read-time"><ClockIcon :size="12" class="mr-4" /> {{ readTime(article.html) }} min</span>
            </div>
          </div>
        </RouterLink>
      </div>

      <div v-if="articles.length > 4 && !showAll" class="section-footer reveal delay-4">
        <button class="btn-premium" @click="showAll = true">
          Ver más reseñas
          <ChevronDownIcon :size="18" />
        </button>
      </div>
    </div>
  </section>

  <!-- Trust / Values Section -->
  <section class="trust-section reveal delay-3">
    <div class="container">
      <div class="section-head">
        <h3>El Estándar Homzy</h3>
        <p>Nuestro compromiso con la honestidad y la calidad</p>
      </div>
      <div class="trust-grid">
        <div class="trust-item reveal delay-1">
          <div class="trust-icon"><ShieldCheckIcon :size="32" /></div>
          <h4>Sin Patrocinios</h4>
          <p>No aceptamos pagos por reseñas. Los enlaces de afiliado no determinan nuestras conclusiones editoriales.</p>
        </div>
        <div class="trust-item reveal delay-2">
          <div class="trust-icon"><ZapIcon :size="32" /></div>
          <h4>Investigación en Profundidad</h4>
          <p>Contrastamos especificaciones, documentación y opiniones disponibles para resumir lo importante.</p>
        </div>
        <div class="trust-item reveal delay-3">
          <div class="trust-icon"><AwardIcon :size="32" /></div>
          <h4>Selección Curada</h4>
          <p>Priorizamos utilidad, relación calidad-precio y adecuación a distintos hogares.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How We Test Section -->
  <section class="steps-section reveal delay-1">
    <div class="container">
      <div class="section-head">
        <h3>Cómo elaboramos nuestros análisis</h3>
        <p>Un proceso editorial para ofrecer información útil y verificable</p>
      </div>
      <div class="steps-grid">
        <div class="step-card reveal delay-1">
          <div class="step-num">01</div>
          <h4>Fase de Selección</h4>
          <p>Buscamos productos que resuelvan problemas reales con buen diseño.</p>
        </div>
        <div class="step-card reveal delay-2">
          <div class="step-num">02</div>
          <h4>Investigación</h4>
          <p>Revisamos especificaciones, manuales, información del fabricante y opiniones de usuarios.</p>
        </div>
        <div class="step-card reveal delay-3">
          <div class="step-num">03</div>
          <h4>Análisis Técnico</h4>
          <p>Comparamos prestaciones, limitaciones y alternativas con criterios consistentes.</p>
        </div>
        <div class="step-card reveal delay-4">
          <div class="step-num">04</div>
          <h4>Veredicto Final</h4>
          <p>Resumimos para quién puede ser adecuado el producto y qué conviene comprobar antes de comprar.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Newsletter CTA -->
  <section class="section reveal delay-1">
    <div class="container">
      <div class="cta-banner">
        <div class="cta-content">
          <h2>Únete a la comunidad Homzy</h2>
          <p>Recibe nuevos análisis y consejos de diseño minimalista en tu bandeja de entrada.</p>
          <form class="cta-form" @submit.prevent="handleSubscribe">
            <input type="email" v-model="email" placeholder="Escribe tu email aquí..." required />
            <button type="submit">Suscribirme</button>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import api from "../api.js";
import { useToastStore } from "../stores/toast.js";
import { 
  SearchIcon, 
  SmartphoneIcon, 
  HomeIcon, 
  CpuIcon, 
  CoffeeIcon, 
  MusicIcon, 
  LampIcon, 
  ZapIcon,
  ClockIcon,
  PackageIcon,
  ShieldCheckIcon,
  AwardIcon,
  ChevronDownIcon
} from "lucide-vue-next";

const articles = ref([]);
const categories = ref([]);
const showAll = ref(false);
const email = ref("");
const toast = useToastStore();
const router = useRouter();
const searchQuery = ref("");

function submitSearch() {
  const query = searchQuery.value.trim();
  if (query) router.push({ path: "/buscar", query: { q: query } });
}

const featuredArticle = computed(() => {
  return articles.value.find(a => a.is_featured === 1) || articles.value[0];
});

const articlesToShow = computed(() => {
  if (!featuredArticle.value) return articles.value;
  
  // Filter out the featured article from the rest of the list
  const others = articles.value.filter(a => a.id !== featuredArticle.value.id);
  
  if (showAll.value) return others;
  return others.slice(0, 3);
});

async function loadCategories() {
  const { data } = await api.get("/categories");
  categories.value = data;
}

async function loadArticles() {
  const params = { status: "published" };
  const { data } = await api.get("/articles", { params });
  articles.value = data;
}

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

function getCategoryIcon(name = "") {
  const label = name.toLowerCase();
  if (label.includes("hogar")) return HomeIcon;
  if (label.includes("tec") || label.includes("gadget")) return CpuIcon;
  if (label.includes("móvil") || label.includes("smartphone")) return SmartphoneIcon;
  if (label.includes("cocina") || label.includes("café")) return CoffeeIcon;
  if (label.includes("audio") || label.includes("sonido")) return MusicIcon;
  if (label.includes("ilumin")) return LampIcon;
  if (label.includes("energ")) return ZapIcon;
  return PackageIcon;
}

function categoryName(id) {
  return categories.value.find((cat) => cat.id === id)?.name || "";
}

function categoryCount(id) {
  return articles.value.filter((article) => article.category_id === id).length || 0;
}

function readTime(html = "") {
  const words = html.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.ceil(words / 180));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getThumbStyle(id) {
  const gradients = [
    'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Indigo to Purple
    'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', // Blue to Teal
    'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)', // Rose to Orange
    'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', // Emerald to Blue
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'  // Amber to Red
  ];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return { background: gradients[index] };
}

onMounted(async () => {
  await loadCategories();
  await loadArticles();
});
</script>
