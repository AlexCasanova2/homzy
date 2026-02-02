<template>
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>

  <section class="hero-main reveal">
    <div class="hero-bg-image" style="background-image: url('/hero.png')"></div>
    <div class="container--narrow hero-content">
      <h2 class="hero-title">
        Diseño y <span class="text-gradient">Tecnología</span> para tu Hogar
      </h2>
      <p class="hero-subtitle">Descubre productos honestos que transforman tu espacio habitual</p>
      
      <div class="hero-search">
        <input type="text" placeholder="¿Qué estás buscando hoy?" />
        <button class="search-btn"><SearchIcon :size="20" /></button>
      </div>
    </div>
  </section>

  <!-- Featured Section -->
  <section v-if="articles[0]" class="section container reveal delay-1">
    <div class="featured-card glass card--hover" @click="$router.push(`/article/${articles[0].id}`)">
      <div class="featured-badge">Nueva Reseña Destacada</div>
      <div class="featured-grid">
        <div class="featured-thumb" :style="getThumbStyle(articles[0].id)">
          <!-- We could add real images here -->
        </div>
        <div class="featured-info">
          <span class="category-chip">{{ categoryName(articles[0].id) || "Análisis Pro" }}</span>
          <h3>{{ articles[0].title }}</h3>
          <p>{{ articles[0].meta_description || "Descubre nuestro veredicto detallado sobre este innovador producto..." }}</p>
          <div class="featured-footer">
            <div class="user-meta">
              <div class="avatar-mini">H</div>
              <span>Por Equipo Homzy</span>
            </div>
            <button class="btn-primary-slim">Leer Análisis Completo</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section container reveal delay-2" id="categorias">
    <div class="section-head">
      <h3>Explora por Categoría</h3>
      <p>Miles de productos organizados para tu comodidad</p>
    </div>
    <div class="category-row">
      <div v-for="(category, index) in categories" :key="category.id" 
           class="category-card glass reveal" 
           :class="'delay-' + (index + 2)">
        <div class="category-icon">
          <component :is="getCategoryIcon(category.name)" :size="20" />
        </div>
        <h4>{{ category.name }}</h4>
        <span>{{ categoryCount(category.id) }} artículos</span>
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
          <p>No aceptamos pagos por reseñas. Nuestra opinión es 100% independiente y real.</p>
        </div>
        <div class="trust-item reveal delay-2">
          <div class="trust-icon"><ZapIcon :size="32" /></div>
          <h4>Análisis en Profundidad</h4>
          <p>Pasamos semanas probando cada gadget para que tú solo necesites 5 minutos.</p>
        </div>
        <div class="trust-item reveal delay-3">
          <div class="trust-icon"><AwardIcon :size="32" /></div>
          <h4>Selección Curada</h4>
          <p>Solo los productos que realmente usaríamos en nuestra propia casa.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section container reveal delay-4">
    <div class="section-head">
      <h3>Reseñas Recientes</h3>
      <p>Análisis recién salidos del laboratorio</p>
    </div>
    <div class="grid grid-3">
      <RouterLink
        v-for="(article, index) in articles.slice(1)"
        :key="article.id"
        class="review-card reveal"
        :class="'delay-' + ((index % 4) + 1)"
        :to="`/article/${article.id}`"
      >
        <div class="review-thumb" :style="getThumbStyle(article.id)">
          <span class="review-pill">{{ categoryName(article.category_id) || "Análisis" }}</span>
        </div>
        <div class="review-body">
          <div class="review-meta">
            <span class="date">{{ formatDate(article.published_at || article.created_at) }}</span>
          </div>
          <h4>{{ article.title }}</h4>
          <p class="meta-desc">{{ article.meta_description || "Descubre nuestro análisis detallada sobre este producto..." }}</p>
          <div class="review-footer">
            <div class="rating-box">
              <StarIcon v-for="i in 5" :key="i" :size="12" :class="{ 'filled': i <= 5 }" />
              <span class="rating-val">5.0</span>
            </div>
            <span class="read-time"><ClockIcon :size="12" class="mr-4" /> {{ readTime(article.html) }} min</span>
          </div>
        </div>
      </RouterLink>
    </div>
  </section>

  <!-- Newsletter CTA -->
  <section class="container reveal delay-1">
    <div class="cta-banner">
      <div class="cta-content">
        <h2>Únete a la comunidad Homzy</h2>
        <p>Recibe los mejores gadgets y consejos de diseño minimalista cada semana en tu bandeja de entrada.</p>
        <form class="cta-form" @submit.prevent>
          <input type="email" placeholder="Escribe tu email aquí..." />
          <button type="submit">Suscribirme</button>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import api from "../api.js";
import { 
  SearchIcon, 
  SmartphoneIcon, 
  HomeIcon, 
  CpuIcon, 
  CoffeeIcon, 
  MusicIcon, 
  LampIcon, 
  ZapIcon,
  StarIcon,
  ClockIcon,
  PackageIcon,
  ShieldCheckIcon,
  AwardIcon
} from "lucide-vue-next";

const articles = ref([]);
const categories = ref([]);

async function loadCategories() {
  const { data } = await api.get("/categories");
  categories.value = data;
}

async function loadArticles() {
  const params = { status: "published" };
  const { data } = await api.get("/articles", { params });
  articles.value = data;
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
  const colors = [
    'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
    'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
  ];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return { background: colors[index] };
}

onMounted(async () => {
  await loadCategories();
  await loadArticles();
});
</script>
