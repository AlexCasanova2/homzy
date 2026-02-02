<template>
  <div class="categories-page reveal">
    <section class="section">
      <div class="container--narrow text-center mb-48">
        <h1 class="page-title">Explora por Categoría</h1>
        <p class="page-subtitle">Explora nuestros análisis detallados organizados por lo que más te interesa.</p>
      </div>

      <div class="container">
        <div class="categories-grid">
          <RouterLink 
            v-for="cat in categories" 
            :key="cat.id" 
            :to="`/categoria/${cat.slug}`"
            class="category-card card glass card--hover"
          >
            <div class="category-icon-wrapper">
              <FolderIcon :size="32" />
            </div>
            <div class="category-info">
              <h3>{{ cat.name }}</h3>
              <p v-if="cat.description" class="cat-desc">{{ cat.description }}</p>
              <span class="cat-count">Ver todos los análisis</span>
            </div>
          </RouterLink>
        </div>

        <div v-if="categories.length === 0" class="text-center py-64">
           <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <p class="mt-16 text-muted">Cargando categorías...</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { FolderIcon } from "lucide-vue-next";
import api from "../api.js";

const categories = ref([]);

async function loadCategories() {
  try {
    const { data } = await api.get("/categories");
    categories.value = data;
  } catch (error) {
    console.error("Error loading categories:", error);
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
  font-family: "Montserrat", sans-serif;
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 20px;
  color: var(--secondary);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.category-card {
  display: flex;
  flex-direction: column;
  padding: 32px;
  text-align: center;
  align-items: center;
  transition: all 0.3s ease;
  height: 100%;
}

.category-icon-wrapper {
  width: 64px;
  height: 64px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.category-card:hover .category-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  background: var(--primary);
  color: white;
}

.category-info h3 {
  font-family: "Montserrat", sans-serif;
  font-size: 22px;
  margin-bottom: 12px;
}

.cat-desc {
  font-size: 14px;
  color: var(--secondary);
  line-height: 1.5;
  margin-bottom: 20px;
}

.cat-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: auto;
}

.mb-48 { margin-bottom: 48px; }
.py-64 { padding: 64px 0; }
.mt-16 { margin-top: 16px; }
.text-center { text-align: center; }
</style>
