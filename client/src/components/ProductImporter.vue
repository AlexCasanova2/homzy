<template>
  <div class="product-importer">
    <section class="card mb-32">
      <div class="section-header">
        <span class="header-icon"><DownloadIcon :size="20" /></span>
        <div>
          <h3>Importar Producto</h3>
          <p>Extrae datos automáticamente de Amazon</p>
        </div>
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label>URL de Amazon</label>
          <div class="input-with-icon">
            <span class="input-icon"><LinkIcon :size="16" /></span>
            <input v-model="form.url" placeholder="https://www.amazon.es/dp/ASIN" />
          </div>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select v-model="form.categoryId">
            <option value="">Sin categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="form-actions">
        <button class="primary" @click="importProduct" :disabled="!form.url">
          Scrappear Producto
        </button>
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <span class="header-icon"><PackageIcon :size="20" /></span>
        <div>
          <h3>Productos Importados</h3>
          <p>Gestiona tu catálogo y genera artículos</p>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>ASIN</th>
              <th>Producto</th>
              <th>Precio</th>
              <th>Rating</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td><code class="asin-code">{{ product.asin }}</code></td>
              <td class="product-title-cell">{{ product.title }}</td>
              <td class="font-bold">{{ product.price || '-' }}</td>
              <td>
                <span v-if="product.rating" class="rating-badge">
                  <StarIcon :size="12" class="mr-4" /> {{ product.rating }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="text-right">
                <button class="secondary small" @click="generateArticle(product)" :disabled="isGenerating">
                  <div class="flex-center">
                    <SparklesIcon :size="14" class="mr-8" />
                    {{ isGenerating ? "Generando..." : "Generar artículo" }}
                  </div>
                </button>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="5" class="text-center py-40 text-muted">
                No hay productos importados todavía.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Overlay Loading -->
    <div v-if="isGenerating" class="loading-overlay">
      <div class="loading-card card glass">
        <div class="spinner-container">
          <div class="spinner"></div>
          <SparklesIcon class="inner-icon" :size="20" />
        </div>
        <h3>Creando Magia Content</h3>
        <p class="status-text">{{ currentStatus }}</p>
        
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: Math.min((elapsed / 30) * 100, 100) + '%' }"></div>
        </div>
        
        <div class="elapsed-mini">Tiempo transcurrido: {{ elapsed }}s</div>
      </div>
    </div>

    <!-- Preview Modal/Section -->
    <section v-if="generated" class="card mt-32 border-primary">
      <div class="section-header">
        <span class="header-icon"><FileTextIcon :size="20" /></span>
        <div>
          <h3>Borrador Generado</h3>
          <p>ID: {{ generated.id }}</p>
        </div>
        <button class="secondary small ml-auto" @click="generated = null">Cerrar</button>
      </div>
      <div class="article-preview-container">
        <div class="article-html-v3" v-html="generated.html"></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mb-32 { margin-bottom: 32px; }
.mt-32 { margin-top: 32px; }
.ml-auto { margin-left: auto; }
.mr-4 { margin-right: 4px; }
.mr-8 { margin-right: 8px; }
.py-40 { padding: 40px 0; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.font-bold { font-weight: 700; }
.flex-center { display: flex; align-items: center; justify-content: center; }

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-icon {
  width: 40px;
  height: 40px;
  background: var(--user-gradient);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.input-with-icon input {
  padding-left: 40px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.asin-code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.product-title-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.rating-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-card {
  text-align: center;
  width: 420px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px;
}

.loading-card h3 {
  margin-bottom: 8px;
  color: var(--primary);
}

.status-text {
  font-size: 14px;
  color: var(--text-muted);
  min-height: 48px; /* Reserved space for 2 lines to avoid jumping */
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  padding: 0 20px;
}

.spinner-container {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 24px;
}

.inner-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary);
  animation: pulse 2s infinite;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.5s ease;
}

.elapsed-mini {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.article-preview-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 32px;
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.article-html-v3 {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
}

.article-html-v3 h2 { color: var(--text); margin-top: 32px; margin-bottom: 16px; }
.article-html-v3 p { margin-bottom: 20px; }
.article-html-v3 ul { margin-bottom: 20px; padding-left: 20px; }
</style>

<script setup>
import { onMounted, ref, computed } from "vue";
import api from "../api.js";
import { 
  DownloadIcon, 
  LinkIcon, 
  PackageIcon, 
  StarIcon, 
  SparklesIcon, 
  FileTextIcon 
} from "lucide-vue-next";
import { useToastStore } from "../stores/toast.js";

const products = ref([]);
const categories = ref([]);
const form = ref({ url: "", categoryId: "" });
const generated = ref(null);
const isGenerating = ref(false);
const elapsed = ref(0);
const currentStepIndex = ref(0);
const toast = useToastStore();
let timerId = null;

const statusSteps = [
  "Analizando especificaciones del producto...",
  "Extrayendo puntos clave de las reseñas...",
  "Investigando palabras clave de alto rendimiento...",
  "Estructurando el contenido del artículo...",
  "Redactando párrafos persuasivos...",
  "Optimizando para buscadores (SEO)...",
  "Generando bloques de recomendación...",
  "Finalizando los últimos detalles..."
];

const currentStatus = computed(() => {
  const index = Math.min(Math.floor(elapsed.value / 4), statusSteps.length - 1);
  return statusSteps[index];
});

async function loadProducts() {
  const { data } = await api.get("/products");
  products.value = data;
}

async function loadCategories() {
  const { data } = await api.get("/categories");
  categories.value = data;
}

async function importProduct() {
  if (!form.value.url) return;
  try {
    await api.post("/products/import", form.value);
    form.value.url = "";
    await loadProducts();
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Error al importar.";
    alert(message);
  }
}

async function generateArticle(product) {
  try {
    isGenerating.value = true;
    elapsed.value = 0;
    timerId = setInterval(() => {
      elapsed.value += 1;
    }, 1000);
    const { data } = await api.post("/generate-article", {
      productId: product.id,
      categoryId: product.categoryId,
    });
    generated.value = data;
    toast.success("¡Artículo generado con éxito!");
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Error al generar.";
    toast.error(message);
  } finally {
    isGenerating.value = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
}

onMounted(async () => {
  await loadCategories();
  await loadProducts();
});
</script>
