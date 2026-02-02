<template>
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>

  <section class="hero-main reveal">
    <div class="hero-bg-image" style="background-image: url('/hero.png')"></div>
    <div class="container hero-content">
      <h2 class="hero-title">
        Diseño y <span class="text-gradient">Tecnología</span> <br/> para tu Hogar
      </h2>
      <p class="hero-subtitle">Descubre productos honestos que transforman tu espacio habitual con un toque de distinción.</p>
      
      <div class="hero-search">
        <input type="text" placeholder="¿Qué estás buscando hoy?" />
        <button class="search-btn"><SearchIcon :size="20" /></button>
      </div>
    </div>
  </section>

  <!-- Featured Section -->
  <section v-if="articles[0]" class="section reveal delay-1" style="padding-top: 0">
    <div class="container">
      <div class="featured-card glass card--hover" @click="$router.push(`/analisis/${articles[0].slug}`)">
        <div class="featured-badge">Nueva Reseña Destacada</div>
        <div class="featured-grid">
          <div class="featured-thumb" :style="getThumbStyle(articles[0].id)">
            <img v-if="articles[0].image_url" :src="articles[0].image_url" class="thumb-image" alt="Destacado" />
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
    </div>
  </section>

  <section class="section reveal delay-2" id="categorias">
    <div class="container">
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
    </div>
  </section>

  <section class="section reveal delay-4">
    <div class="container">
      <div class="section-head">
        <h3>Reseñas Recientes</h3>
        <p>Análisis recién salidos del laboratorio</p>
      </div>
      <div class="grid grid-3">
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

  <!-- How We Test Section -->
  <section class="steps-section reveal delay-1">
    <div class="container">
      <div class="section-head">
        <h3>Cómo probamos cada producto</h3>
        <p>Nuestro proceso riguroso para garantizar tu satisfacción</p>
      </div>
      <div class="steps-grid">
        <div class="step-card reveal delay-1">
          <div class="step-num">01</div>
          <h4>Fase de Selección</h4>
          <p>Buscamos productos que resuelvan problemas reales con buen diseño.</p>
        </div>
        <div class="step-card reveal delay-2">
          <div class="step-num">02</div>
          <h4>Prueba de Usuario</h4>
          <p>Utilizamos el producto en contextos reales durante al menos 15 días.</p>
        </div>
        <div class="step-card reveal delay-3">
          <div class="step-num">03</div>
          <h4>Análisis Técnico</h4>
          <p>Medimos durabilidad, batería y rendimiento bajo estrés.</p>
        </div>
        <div class="step-card reveal delay-4">
          <div class="step-num">04</div>
          <h4>Veredicto Final</h4>
          <p>Asignamos una puntuación honesta basada en la relación calidad/precio.</p>
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
          <p>Recibe los mejores gadgets y consejos de diseño minimalista cada semana en tu bandeja de entrada.</p>
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
import { RouterLink } from "vue-router";
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
  StarIcon,
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

const articlesToShow = computed(() => {
  // If we have few articles, just show all in the grid (redundant but fills the space)
  if (articles.value.length <= 4) return articles.value;
  
  // Otherwise, skip the first (already featured) and show 3 or all
  if (showAll.value) return articles.value.slice(1);
  return articles.value.slice(1, 4);
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
