<template>
  <div class="reading-progress-container">
    <div class="reading-progress-bar" :style="{ width: readingProgress + '%' }"></div>
  </div>

  <section class="article-shell container reveal">
    <nav class="breadcrumbs">
      <RouterLink to="/">Inicio</RouterLink>
      <ChevronRightIcon :size="14" />
      <span>{{ categoryName(article?.category_id) || "Análisis" }}</span>
    </nav>

    <header class="article-header">
      <h1 class="article-title">{{ article?.title || "Cargando análisis..." }}</h1>
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
        <div class="meta-item category-tag">
          <TagIcon :size="16" />
          <span>{{ categoryName(article?.category_id) }}</span>
        </div>
      </div>
    </header>

    <div class="article-layout">
      <main class="article-main">
        <div v-if="article" class="article-content-v3" v-html="article.html"></div>
        <div v-else class="article-skeleton">
          <!-- Loading skeleton could go here -->
          <p>Cargando contenido detallado...</p>
        </div>
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
              <p>Expertos en lifestyle y tecnología para el hogar con más de 10 años de experiencia analizando tendencias.</p>
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
              <span>Dificultad</span>
              <strong>Baja</strong>
            </div>
          </div>
        </div>

        <div class="side-card bg-primary text-white reveal" style="animation-delay: 0.2s">
          <h4>¿Te ha gustado?</h4>
          <p>Suscríbete para recibir más guías honestas como esta directamente en tu correo.</p>
          <div class="newsletter-mini">
            <input type="email" placeholder="tu@email.com" />
            <button class="btn-white">Unirme</button>
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
  </section>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from "vue";
import { RouterLink, useRoute } from "vue-router";
import api from "../api.js";
import { 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon, 
  TagIcon, 
  InfoIcon, 
  ArrowLeftIcon,
  Share2Icon,
  UserIcon,
  ShieldCheckIcon
} from "lucide-vue-next";

const route = useRoute();
const article = ref(null);
const categories = ref([]);
const readingProgress = ref(0);

const updateProgress = () => {
  const scrolled = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  readingProgress.value = (scrolled / height) * 100;
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

onMounted(async () => {
  window.addEventListener('scroll', updateProgress);
  await loadCategories();
  const { data } = await api.get(`/articles/${route.params.id}`);
  article.value = data;
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress);
});
</script>
