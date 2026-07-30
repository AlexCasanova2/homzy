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

      <div class="monetization-status" :class="{ warning: !affiliateLinks.length }">
        <LinkIcon :size="18" />
        <div>
          <strong>Monetización: {{ affiliateLinks.length ? `${affiliateLinks.length} enlace(s) afiliado(s) disponible(s)` : "sin enlaces afiliados guardados" }}</strong>
          <p v-if="affiliateLinks.length">Al generar, se usará el enlace cuyo ASIN coincida; en caso contrario se necesita el identificador global de Amazon configurado.</p>
          <p v-else>La generación necesita el identificador global de Amazon configurado en el servidor. Si falta, no podrá crear un enlace de compra válido.</p>
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
            <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
              {{ indent(cat.depth) }}{{ cat.name }}
            </option>
            <option value="__new__">＋ Crear nueva categoría…</option>
          </select>

          <div v-if="form.categoryId === '__new__'" class="new-category-box">
            <input v-model="newCategory.name" placeholder="Nombre de la nueva categoría" @keyup.enter="createCategory(true)" />
            <select v-model="newCategory.parentId">
              <option value="">Sin padre (categoría raíz)</option>
              <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ indent(cat.depth) }}{{ cat.name }}
              </option>
            </select>
            <div class="new-category-actions">
              <button class="primary small" @click="createCategory(true)" :disabled="creatingCategory || !newCategory.name.trim()">
                {{ creatingCategory ? "Creando..." : "Crear y asignar" }}
              </button>
              <button class="secondary small" @click="createCategory(false)" :disabled="creatingCategory || !newCategory.name.trim()" title="Crea la categoría sin asignarla, y deja el formulario listo para crear una subcategoría dentro de ella">
                Solo crear
              </button>
              <button class="secondary small" @click="form.categoryId = ''">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button class="primary" @click="importProduct" :disabled="!form.url || isImporting">
          {{ isImporting ? "Importando..." : "Importar producto" }}
        </button>
      </div>
      <p v-if="importError" class="inline-error" role="alert">{{ importError }}</p>
    </section>

    <section class="card">
      <div class="section-header">
        <span class="header-icon"><PackageIcon :size="20" /></span>
        <div>
          <h3>Productos Importados</h3>
          <p>Gestiona tu catálogo y genera artículos</p>
        </div>
      </div>

      <div v-if="isLoading" class="inline-loading" aria-live="polite"><div class="spinner"></div><span>Cargando catálogo...</span></div>
      <p v-else-if="loadError" class="inline-error" role="alert">{{ loadError }} <button class="secondary small" @click="loadInitialData">Reintentar</button></p>
      <div v-else class="table-responsive">
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
                <div class="row-actions">
                  <button
                    v-if="product.article"
                    class="secondary small"
                    @click="$router.push(`/admin/articles?edit=${product.article.id}`)"
                    :title="`Editar artículo: ${product.article.title}`"
                  >
                    <div class="flex-center">
                      <FileTextIcon :size="14" class="mr-8" />
                      Artículo
                    </div>
                  </button>
                  <button
                    v-if="product.article?.status === 'published'"
                    class="secondary small"
                    @click="openInFrontend(product.article)"
                    title="Ver el artículo publicado en la web"
                  >
                    <ExternalLinkIcon :size="14" />
                  </button>
                  <button class="secondary small" @click="copyProductData(product)" title="Copiar datos del producto (JSON) para redacción externa">
                    <div class="flex-center">
                      <CopyIcon :size="14" class="mr-8" />
                      Copiar datos
                    </div>
                  </button>
                  <button class="secondary small" @click="reimportProduct(product)" :disabled="reimportingId === product.id" title="Actualizar datos desde Amazon">
                    <div class="flex-center">
                      <RefreshCwIcon :size="14" class="mr-8" />
                      {{ reimportingId === product.id ? "Actualizando..." : "Reimportar" }}
                    </div>
                  </button>
                  <button class="secondary small" @click="generateArticle(product)" :disabled="isGenerating">
                    <div class="flex-center">
                      <SparklesIcon :size="14" class="mr-8" />
                      {{ generatingId === product.id ? "Generando..." : "Generar artículo" }}
                    </div>
                  </button>
                  <button class="danger small" @click="removeProduct(product)" title="Eliminar producto">
                    <Trash2Icon :size="14" />
                  </button>
                </div>
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
.row-actions { display: inline-flex; gap: 8px; }

.new-category-box {
  margin-top: 12px;
  padding: 14px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--primary-light);
  display: grid;
  gap: 10px;
}

.new-category-actions {
  display: flex;
  gap: 8px;
}

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

.monetization-status { display: flex; gap: 12px; align-items: flex-start; margin: -4px 0 20px; padding: 14px 16px; border-radius: var(--radius-md); background: #ecfdf5; color: #166534; border: 1px solid #a7f3d0; }
.monetization-status.warning { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.monetization-status p { margin-top: 2px; font-size: 12px; line-height: 1.45; }
.inline-loading { display: flex; justify-content: center; align-items: center; gap: 12px; min-height: 160px; color: var(--text-muted); }
.inline-error { margin-top: 14px; padding: 12px 14px; border-radius: var(--radius-sm); background: #fef2f2; color: #b91c1c; font-size: 13px; }

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

@media (max-width: 700px) {
  .form-grid { grid-template-columns: 1fr; }
  .card { padding: 18px; }
  .loading-card { width: calc(100% - 32px); padding: 28px 18px; }
}
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
  FileTextIcon,
  CopyIcon,
  RefreshCwIcon,
  Trash2Icon,
  ExternalLinkIcon,
} from "lucide-vue-next";
import { useToastStore } from "../stores/toast.js";

const products = ref([]);
const categories = ref([]);
const affiliateLinks = ref([]);
const form = ref({ url: "", categoryId: "" });
const isGenerating = ref(false);
const generatingId = ref(null);
const isImporting = ref(false);
const reimportingId = ref(null);
const isLoading = ref(true);
const loadError = ref("");
const importError = ref("");
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
  isImporting.value = true;
  importError.value = "";
  try {
    const payload = { url: form.value.url };
    if (form.value.categoryId && form.value.categoryId !== "__new__") payload.categoryId = form.value.categoryId;
    await api.post("/products/import", payload);
    form.value.url = "";
    await loadProducts();
  } catch (error) {
    importError.value = error?.response?.data?.error || error?.message || "No se pudo importar el producto.";
  } finally {
    isImporting.value = false;
  }
}

async function reimportProduct(product) {
  if (!product.url) {
    toast.error("Este producto no tiene URL guardada.");
    return;
  }
  reimportingId.value = product.id;
  try {
    await api.post("/products/import", { url: product.url, categoryId: product.categoryId || undefined });
    await loadProducts();
    toast.success("Producto actualizado desde Amazon");
  } catch (error) {
    toast.error(error?.response?.data?.error || "No se pudo reimportar el producto.");
  } finally {
    reimportingId.value = null;
  }
}

async function removeProduct(product) {
  if (!window.confirm(`¿Eliminar "${product.title}" del catálogo?`)) return;
  try {
    await api.delete(`/products/${product.id}`);
    await loadProducts();
    toast.success("Producto eliminado");
  } catch (error) {
    toast.error(error?.response?.data?.error || "No se pudo eliminar el producto.");
  }
}

function openInFrontend(article) {
  window.open(`/analisis/${article.slug}`, "_blank", "noopener");
}

// Árbol de categorías aplanado en orden padre→hijas, con profundidad para la sangría.
const categoryOptions = computed(() => {
  const byParent = new Map();
  for (const cat of categories.value) {
    const key = cat.parent_id || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(cat);
  }
  const result = [];
  const walk = (parentId, depth) => {
    for (const cat of (byParent.get(parentId) || []).sort((a, b) => a.name.localeCompare(b.name))) {
      result.push({ ...cat, depth });
      walk(cat.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
});

function indent(depth) {
  return depth ? `${"   ".repeat(depth)}└ ` : "";
}

const newCategory = ref({ name: "", parentId: "" });
const creatingCategory = ref(false);

async function createCategory(assign = true) {
  const name = newCategory.value.name.trim();
  if (!name) return;
  creatingCategory.value = true;
  try {
    const { data } = await api.post("/categories", { name, parentId: newCategory.value.parentId || null });
    const { data: cats } = await api.get("/categories");
    categories.value = cats;
    if (assign) {
      form.value.categoryId = data.id;
      newCategory.value = { name: "", parentId: "" };
      toast.success(`Categoría "${data.name}" creada y asignada`);
    } else {
      // La recién creada queda preseleccionada como padre: encadenar subcategorías es inmediato.
      newCategory.value = { name: "", parentId: data.id };
      toast.success(`Categoría "${data.name}" creada`);
    }
  } catch (error) {
    toast.error(error?.response?.data?.error || "No se pudo crear la categoría.");
  } finally {
    creatingCategory.value = false;
  }
}

async function copyProductData(product) {
  const payload = {
    asin: product.asin,
    title: product.title,
    price: product.price,
    rating: product.rating,
    reviews: product.reviews,
    features: product.features,
    description: product.description || null,
    details: product.details || null,
    images: product.images,
    url: product.url,
  };
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Datos del producto copiados al portapapeles");
  } catch {
    toast.error("No se pudo copiar. Comprueba los permisos del navegador.");
  }
}

async function generateArticle(product) {
  const affiliate = affiliateLinks.value.find((link) => link.asin?.toUpperCase() === product.asin?.toUpperCase());
  try {
    isGenerating.value = true;
    generatingId.value = product.id;
    elapsed.value = 0;
    timerId = setInterval(() => {
      elapsed.value += 1;
    }, 1000);
    const { data } = await api.post("/generate-article", {
      productId: product.id,
      categoryId: product.category_id,
      ...(affiliate ? { affiliateLinkId: affiliate.id } : {}),
    });
    await loadProducts();
    toast.success("¡Borrador generado con éxito!", { label: "Abrir artículo", to: `/admin/articles?edit=${data.id}` });
  } catch (error) {
    let message = error?.response?.data?.error || error?.message || "Error al generar.";
    if (!affiliate) {
      message += " Comprueba que el identificador de afiliado de Amazon esté configurado o crea un enlace afiliado para este ASIN.";
    }
    toast.error(message);
  } finally {
    isGenerating.value = false;
    generatingId.value = null;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
}

async function loadInitialData() {
  isLoading.value = true;
  loadError.value = "";
  try {
    const [productsResponse, categoriesResponse, affiliatesResponse] = await Promise.all([
      api.get("/products"),
      api.get("/categories"),
      api.get("/affiliate-links"),
    ]);
    products.value = productsResponse.data;
    categories.value = categoriesResponse.data;
    affiliateLinks.value = affiliatesResponse.data;
  } catch (error) {
    loadError.value = error?.response?.data?.error || "No se pudieron cargar productos, categorías y monetización.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadInitialData);
</script>
