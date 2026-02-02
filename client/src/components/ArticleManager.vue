<template>
  <div class="article-manager">
    <!-- List View (Default) -->
    <section v-if="!showForm" class="card">
      <div class="section-header">
        <span class="header-icon"><FileTextIcon :size="20" /></span>
        <div class="header-info">
          <h3>Mis Artículos</h3>
          <p>Listado completo de entradas publicadas y borradores</p>
        </div>
        <button class="primary small ml-auto" @click="startCreate">
          <PlusIcon :size="16" class="mr-8" />
          Crear artículo
        </button>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="article in articles" :key="article.id">
              <td class="font-bold">{{ article.title }}</td>
              <td>
                <span class="status-badge" :class="article.status">
                  {{ article.status }}
                </span>
              </td>
              <td class="text-right">
                <div class="action-buttons">
                  <button class="secondary small" @click="preview(article)" title="Previsualizar">
                    <EyeIcon :size="14" />
                  </button>
                  <button class="secondary small" @click="startEdit(article)" title="Editar">
                    <Edit3Icon :size="14" />
                  </button>
                  <button class="secondary small" @click="publish(article)" :disabled="isPublishing" title="Publicar">
                    <div class="flex-center">
                      <CloudUploadIcon :size="14" v-if="!isPublishing" />
                      <span v-else>...</span>
                    </div>
                  </button>
                  <button class="danger small" @click="remove(article)" title="Eliminar">
                    <Trash2Icon :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="articles.length === 0">
              <td colspan="3" class="text-center py-40 text-muted">No hay artículos creados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Form View (Create or Edit) -->
    <section v-else class="card">
      <div class="section-header">
        <span class="header-icon"><PenToolIcon :size="20" /></span>
        <div class="header-info">
          <h3>{{ editingId ? 'Editar Artículo' : 'Crear Artículo Manual' }}</h3>
          <p>{{ editingId ? 'Modifica el contenido y ajusta la configuración' : 'Escribe y publica contenido personalizado' }}</p>
        </div>
        <button class="secondary small ml-auto" @click="closeForm">
           <ArrowLeftIcon :size="16" class="mr-8" />
           Volver al listado
        </button>
      </div>
      
      <div class="form-grid">
        <div class="form-group grid-span-2">
          <label>Título del Artículo</label>
          <input v-model="form.title" placeholder="Ej: Las mejores aspiradoras de 2026" />
        </div>
        
        <div class="form-group grid-span-2 taxonomies-row">
          <div class="taxonomy-section">
            <label>Categorías</label>
            <div class="checkbox-list hierarchical">
              <template v-for="cat in categoryTree" :key="cat.id">
                <div class="checkbox-item-wrapper" :style="{ paddingLeft: (cat.depth * 20) + 'px' }">
                  <label class="checkbox-item">
                    <input type="checkbox" :value="cat.id" v-model="form.categoryIds" />
                    <span class="checkbox-label" :class="{ 'is-parent': cat.children?.length }">{{ cat.name }}</span>
                  </label>
                </div>
              </template>
              <div v-if="categories.length === 0" class="empty-taxonomy">Cargando categorías...</div>
            </div>
          </div>

          <div class="taxonomy-section">
            <label>Etiquetas</label>
            <div class="checkbox-list">
              <div v-for="tag in tags" :key="tag.id" class="checkbox-item-wrapper">
                <label class="checkbox-item">
                  <input type="checkbox" :value="tag.id" v-model="form.tags" />
                  <span class="checkbox-label">{{ tag.name }}</span>
                </label>
              </div>
              <div v-if="tags.length === 0" class="empty-taxonomy">Cargando etiquetas...</div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Estado</label>
          <select v-model="form.status">
            <option value="draft">Borrador</option>
            <option value="scheduled">Programado</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Programar Publicación</label>
          <input type="datetime-local" v-model="form.scheduledAt" />
        </div>
      </div>

      <div class="form-group mt-20">
        <label>Contenido del Artículo</label>
        <RichTextEditor v-model="form.html" />
      </div>

      <div class="form-actions mt-24">
        <button class="secondary mr-12" @click="closeForm">Cancelar</button>
        <button v-if="editingId" class="primary" @click="updateArticle">Actualizar Artículo</button>
        <button v-else class="primary" @click="createArticle">Guardar Artículo</button>
      </div>
    </section>

    <!-- Preview Modal -->
    <div v-if="activePreview" class="modal-overlay" @click.self="activePreview = null">
      <div class="modal-card card">
        <div class="modal-header">
          <h3>Previsualización: {{ activePreview.title }}</h3>
          <div class="modal-actions">
            <button class="primary small mr-12" @click="editFromPreview">
              <Edit3Icon :size="14" class="mr-4" /> Editar ahora
            </button>
            <button class="icon-button" @click="activePreview = null"><XIcon :size="18" /></button>
          </div>
        </div>
        <div class="modal-body">
          <div class="article-preview-content" v-html="activePreview.html"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import api from "../api.js";
import RichTextEditor from "./RichTextEditor.vue";
import { useToastStore } from "../stores/toast.js";
import { 
  PenToolIcon, 
  FileTextIcon, 
  EyeIcon, 
  CloudUploadIcon, 
  Trash2Icon, 
  XIcon,
  PlusIcon,
  ArrowLeftIcon,
  Edit3Icon
} from "lucide-vue-next";

const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const activePreview = ref(null);
const isPublishing = ref(false);
const showForm = ref(false);
const editingId = ref(null);
const publishElapsed = ref(0);
let publishTimer = null;
const toast = useToastStore();

const categoryTree = computed(() => {
  const tree = [];
  const map = {};
  
  categories.value.forEach(cat => {
    map[cat.id] = { ...cat, children: [], depth: 0 };
  });
  
  categories.value.forEach(cat => {
    if (cat.parent_id && map[cat.parent_id]) {
      map[cat.parent_id].children.push(map[cat.id]);
    } else {
      tree.push(map[cat.id]);
    }
  });

  const flatten = (nodes, depth = 0) => {
    let result = [];
    nodes.forEach(node => {
      node.depth = depth;
      result.push(node);
      if (node.children.length) {
        result = result.concat(flatten(node.children, depth + 1));
      }
    });
    return result;
  };

  return flatten(tree);
});

const form = ref({
  title: "",
  html: "",
  status: "draft",
  categoryIds: [], // Now multiple
  tags: [],
  scheduledAt: "",
});

async function loadArticles() {
  const { data } = await api.get("/articles");
  articles.value = data;
}

async function loadTaxonomy() {
  const [cats, tagsResp] = await Promise.all([api.get("/categories"), api.get("/tags")]);
  categories.value = cats.data;
  tags.value = tagsResp.data;
}

function startCreate() {
  editingId.value = null;
  form.value = { title: "", html: "", status: "draft", categoryIds: [], tags: [], scheduledAt: "" };
  showForm.value = true;
}

function startEdit(article) {
  editingId.value = article.id;
  form.value = { 
    ...article,
    categoryIds: article.categoryIds || (article.categoryId ? [article.categoryId] : []),
    tags: article.tags ? (typeof article.tags === 'string' ? JSON.parse(article.tags) : JSON.parse(JSON.stringify(article.tags))) : []
  };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

function editFromPreview() {
  const art = activePreview.value;
  activePreview.value = null;
  startEdit(art);
}

async function createArticle() {
  if (!form.value.title) return toast.error("Por favor, introduce un título.");
  try {
    await api.post("/articles", form.value);
    toast.success("Artículo creado correctamente");
    closeForm();
    await loadArticles();
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Error al guardar.";
    toast.error(message);
  }
}

async function updateArticle() {
  if (!form.value.title) return toast.error("Por favor, introduce un título.");
  try {
    await api.put(`/articles/${editingId.value}`, form.value);
    toast.success("Artículo actualizado");
    closeForm();
    await loadArticles();
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Error al actualizar.";
    toast.error(message);
  }
}

function preview(article) {
  activePreview.value = article;
}

async function publish(article) {
  try {
    isPublishing.value = true;
    publishElapsed.value = 0;
    publishTimer = setInterval(() => {
      publishElapsed.value += 1;
    }, 1000);
    await api.post("/publish-article", { articleId: article.id });
    toast.success("¡Artículo publicado con éxito!");
    await loadArticles();
  } catch (error) {
     const message = error?.response?.data?.error || error?.message || "Error al publicar.";
    toast.error(message);
  } finally {
    isPublishing.value = false;
    if (publishTimer) {
      clearInterval(publishTimer);
      publishTimer = null;
    }
  }
}

async function remove(article) {
  if (!confirm("¿Estás seguro de que quieres eliminar este artículo?")) return;
  try {
    await api.delete(`/articles/${article.id}`);
    toast.success("Artículo eliminado");
    await loadArticles();
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || "Error al borrar.";
    toast.error(message);
  }
}

onMounted(async () => {
  await loadTaxonomy();
  await loadArticles();
});
</script>

<style scoped>
.ml-auto { margin-left: auto; }
.mr-4 { margin-right: 4px; }
.mr-8 { margin-right: 8px; }
.mr-12 { margin-right: 12px; }
.mt-20 { margin-top: 20px; }
.mt-24 { margin-top: 24px; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.py-40 { padding: 40px 0; }
.font-bold { font-weight: 600; }
.flex-center { display: flex; align-items: center; justify-content: center; }

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-info {
  flex: 1;
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
  gap: 16px;
}

.grid-span-2 {
  grid-column: span 2;
}

.taxonomies-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.taxonomy-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
}

.checkbox-list {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 180px;
  overflow-y: auto;
  padding: 12px;
}

.checkbox-item-wrapper {
  margin-bottom: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.checkbox-label {
  font-size: 14px;
  color: var(--text);
}

.checkbox-label.is-parent {
  font-weight: 600;
  color: #1e293b;
}

.checkbox-item:hover {
  background: var(--primary-light);
  border-radius: 4px;
}

.empty-taxonomy {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.draft { background: #f1f5f9; color: #475569; }
.status-badge.published { background: #dcfce7; color: #166534; }
.status-badge.scheduled { background: #e0f2fe; color: #0369a1; }

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-actions {
  display: flex;
  align-items: center;
}

.modal-body {
  padding: 32px;
  overflow-y: auto;
  background: #fff;
}

.article-preview-content {
  font-size: 15px;
}
</style>
