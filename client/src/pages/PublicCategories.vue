<template>
  <div class="categories-page reveal">
    <section class="section">
      <div class="container--narrow text-center mb-48">
        <h1 class="page-title">Explora por Categoría</h1>
        <p class="page-subtitle">Explora nuestros análisis detallados organizados por lo que más te interesa.</p>
      </div>

      <div class="container">
        <div v-if="loading" class="text-center py-64">
           <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <p class="mt-16 text-muted">Cargando categorías...</p>
        </div>

        <div v-else-if="loadError" class="text-center py-64">
          <p class="text-muted">No pudimos cargar las categorías. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button class="retry-btn" @click="loadCategories">Reintentar</button>
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-64">
          <p class="text-muted">Todavía no hay categorías publicadas. Vuelve pronto para descubrir nuevos análisis.</p>
          <RouterLink to="/" class="retry-btn">Volver al inicio</RouterLink>
        </div>

        <div v-else class="category-groups">
          <div v-for="root in rootCategories" :key="root.id" class="category-group card glass">
            <RouterLink :to="`/categoria/${root.slug}`" class="group-head">
              <div class="category-icon-wrapper">
                <FolderIcon :size="26" />
              </div>
              <div class="group-info">
                <h3>{{ root.name }}</h3>
                <p v-if="root.description" class="cat-desc">{{ root.description }}</p>
              </div>
            </RouterLink>

            <div v-if="descendantsOf(root.id).length" class="group-chips">
              <RouterLink
                v-for="sub in descendantsOf(root.id)"
                :key="sub.id"
                :to="`/categoria/${sub.slug}`"
                class="chip"
              >
                {{ sub.name }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { FolderIcon } from "lucide-vue-next";
import api from "../api.js";

const categories = ref([]);
const loading = ref(true);
const loadError = ref(false);

const rootCategories = computed(() => categories.value.filter((cat) => !cat.parent_id));

// Descendientes en orden jerárquico (recorrido en profundidad), para que
// "Muebles, Salón, Sofás" aparezcan en su orden lógico y no alfabético plano.
function descendantsOf(rootId) {
  const byParent = new Map();
  for (const cat of categories.value) {
    if (!cat.parent_id) continue;
    if (!byParent.has(cat.parent_id)) byParent.set(cat.parent_id, []);
    byParent.get(cat.parent_id).push(cat);
  }
  const result = [];
  const walk = (id) => {
    for (const child of (byParent.get(id) || []).sort((a, b) => a.name.localeCompare(b.name))) {
      result.push(child);
      walk(child.id);
    }
  };
  walk(rootId);
  return result;
}

async function loadCategories() {
  loading.value = true;
  loadError.value = false;
  try {
    const { data } = await api.get("/categories");
    categories.value = data;
  } catch (error) {
    console.error("Error loading categories:", error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadCategories();
  document.title = "Categorías | Homzy";
});
</script>

<style scoped>
.categories-page {
  padding-top: 40px;
}

.page-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 20px;
  color: var(--secondary);
}

.category-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
  align-items: start;
}

@media (max-width: 480px) {
  .category-groups {
    grid-template-columns: 1fr;
  }
}

.category-group {
  padding: 28px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.group-head:hover h3 {
  color: var(--primary);
}

.category-icon-wrapper {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 18px;
  display: grid;
  place-items: center;
}

.group-info h3 {
  font-size: 22px;
  margin: 0 0 4px;
  transition: color 0.2s ease;
}

.cat-desc {
  font-size: 14px;
  color: var(--secondary);
  line-height: 1.5;
  margin: 0;
}

.group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.chip {
  padding: 7px 16px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--background);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.mb-48 { margin-bottom: 48px; }
.py-64 { padding: 64px 0; }
.mt-16 { margin-top: 16px; }
.text-center { text-align: center; }

.retry-btn {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
</style>
