<template>
  <div class="category-page">
    <section class="category-hero section">
      <div class="container">
        <div class="hero-content text-center">
            <span class="category-badge">Categoría</span>
            <h1 class="category-title">{{ category?.name }}</h1>
            <p v-if="category?.description" class="category-desc">{{ category.description }}</p>
        </div>
      </div>
    </section>

    <section class="section pt-0">
      <div class="container">
        <div v-if="loading" class="text-center py-20">
          <div class="spinner"></div>
        </div>
        
        <div v-else-if="articles.length > 0" class="articles-grid">
           <RouterLink
            v-for="(article, index) in articles"
            :key="article.id"
            :to="`/analisis/${article.slug}`"
            class="article-card card glass card--hover reveal"
            :style="{ animationDelay: (index * 0.1) + 's' }"
          >
            <div class="card-thumb aspect-video">
              <img v-if="article.image_url" :src="article.image_url" :alt="article.title" loading="lazy" />
              <div v-else class="placeholder-thumb"></div>
            </div>
            <div class="card-body">
              <div class="card-meta">
                 <span class="date">{{ formatDate(article.published_at) }}</span>
              </div>
              <h3 class="card-title">{{ article.title }}</h3>
              <p class="card-exc">{{ article.meta_description || 'Leer análisis completo...' }}</p>
              <div class="card-footer">
                <span class="read-more">Leer Análisis →</span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else class="empty-state text-center py-48">
           <p class="text-muted">Aún no hay análisis publicados en esta categoría.</p>
           <RouterLink to="/" class="btn primary mt-4">Ver todos los análisis</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../api.js";

const route = useRoute();
const category = ref(null);
const articles = ref([]);
const loading = ref(true);

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

async function loadCategory() {
  loading.value = true;
  try {
    const slug = route.params.slug;
    const { data: cat } = await api.get(`/categories/slug/${slug}`);
    category.value = cat;

    // Update SEO
    document.title = (cat.seo_title || cat.name) + " | Homzy";
    
    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = cat.seo_description || cat.description || `Análisis y reseñas de ${cat.name}`;

    // Load articles for this category
    const { data: arts } = await api.get(`/articles?categoryId=${cat.id}&status=published`);
    articles.value = arts;

  } catch (error) {
    console.error("Error loading category:", error);
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.slug, loadCategory);
onMounted(loadCategory);
</script>

<style scoped>
.category-hero {
  padding-top: 60px;
  padding-bottom: 40px;
}

.text-center { text-align: center; }

.category-badge {
    background: var(--primary-light);
    color: var(--primary);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
    display: inline-block;
}

.category-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 16px;
    line-height: 1.1;
}

.category-desc {
    font-size: 18px;
    color: var(--secondary);
    max-width: 700px;
    margin: 0 auto;
}

.articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 32px;
}

.aspect-video {
    aspect-ratio: 16/9;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: #f1f5f9;
}

.aspect-video img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.card:hover img {
    transform: scale(1.05);
}

.card-body {
    padding-top: 20px;
}

.card-meta {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
}

.card-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 12px;
    line-height: 1.4;
}

.card-exc {
    font-size: 14px;
    color: var(--secondary);
    margin-bottom: 16px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.read-more {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary);
}

.pt-0 { padding-top: 0; }
.py-20 { padding: 20px 0; }
.py-48 { padding: 48px 0; }
.text-muted { color: var(--text-muted); }
</style>
