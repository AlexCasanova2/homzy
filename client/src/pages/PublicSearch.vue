<template>
  <section class="section search-page">
    <div class="container container--narrow">
      <header class="search-heading">
        <span class="category-chip">Archivo editorial</span>
        <h1>Buscar en Homzy</h1>
        <form class="search-page-form" role="search" @submit.prevent="submit">
          <label class="sr-only" for="search-query">Buscar artículos</label>
          <input id="search-query" v-model="query" type="search" placeholder="Producto, categoría o tema" autofocus />
          <button class="primary" type="submit">Buscar</button>
        </form>
      </header>

      <div v-if="loading" class="search-state" aria-live="polite"><div class="spinner"></div><p>Buscando artículos...</p></div>
      <div v-else-if="error" class="search-state"><h2>No se pudo completar la búsqueda</h2><p>{{ error }}</p><button class="secondary" @click="load">Reintentar</button></div>
      <div v-else-if="!activeQuery" class="search-state"><p>Escribe un término para buscar entre los artículos publicados.</p></div>
      <div v-else-if="results.length === 0" class="search-state"><h2>Sin resultados</h2><p>No encontramos artículos para “{{ activeQuery }}”. Prueba con un término más general.</p></div>
      <div v-else>
        <p class="result-count">{{ results.length }} {{ results.length === 1 ? 'resultado' : 'resultados' }} para “{{ activeQuery }}”</p>
        <div class="search-results">
          <RouterLink v-for="article in results" :key="article.id" :to="`/analisis/${article.slug}`" class="search-result card">
            <img v-if="article.image_url" :src="article.image_url" :alt="article.title" loading="lazy" />
            <div><h2>{{ article.title }}</h2><p>{{ article.meta_description || excerpt(article.html) }}</p><span>Leer análisis</span></div>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import api from "../api.js";

const route = useRoute();
const router = useRouter();
const query = ref("");
const articles = ref([]);
const loading = ref(false);
const error = ref("");
const activeQuery = computed(() => typeof route.query.q === "string" ? route.query.q.trim() : "");
const results = computed(() => {
  const needle = activeQuery.value.toLocaleLowerCase("es");
  if (!needle) return [];
  return articles.value.filter((article) => [article.title, article.meta_description, article.html]
    .filter(Boolean).join(" ").replace(/<[^>]+>/g, " ").toLocaleLowerCase("es").includes(needle));
});

function excerpt(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || "Leer análisis completo.";
}

function submit() {
  const q = query.value.trim();
  router.push({ path: "/buscar", query: q ? { q } : {} });
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get("/articles", { params: { status: "published" } });
    articles.value = data;
  } catch (requestError) {
    error.value = requestError.response?.data?.error || "Inténtalo de nuevo en unos momentos.";
  } finally {
    loading.value = false;
  }
}

watch(activeQuery, (value) => {
  query.value = value;
  document.title = value ? `Buscar: ${value} | Homzy` : "Buscar | Homzy";
}, { immediate: true });

load();
</script>

<style scoped>
.search-page { min-height: 65vh; }
.search-heading { text-align: center; max-width: 720px; margin: 0 auto 48px; }
.search-heading h1 { font: 800 44px/1.15 "Montserrat", sans-serif; margin-bottom: 24px; }
.search-page-form { display: flex; gap: 10px; }
.search-page-form input { font-size: 16px; }
.search-state { min-height: 220px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; color: var(--text-muted); }
.result-count { color: var(--text-muted); margin-bottom: 16px; }
.search-results { display: grid; gap: 18px; }
.search-result { display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: center; }
.search-result img { width: 180px; height: 120px; object-fit: cover; border-radius: var(--radius-md); }
.search-result h2 { font-size: 21px; margin-bottom: 8px; }
.search-result p { color: var(--text-muted); margin-bottom: 8px; }
.search-result span { color: var(--primary); font-weight: 700; }
@media (max-width: 640px) { .search-heading h1 { font-size: 34px; } .search-page-form { flex-direction: column; } .search-result { grid-template-columns: 1fr; } .search-result img { width: 100%; height: 180px; } }
</style>
