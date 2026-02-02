<template>
  <div class="taxonomy-manager">
    <div class="admin-panels">
      <!-- Categories Panel -->
      <section class="card">
        <div class="section-header">
          <span class="header-icon"><FolderIcon :size="18" /></span>
          <div>
            <h3>Categorías</h3>
            <p>Organiza tus productos por tipo</p>
          </div>
          <button class="primary small ml-auto" @click="openModal()">+ Nueva Categoría</button>
        </div>

        <div class="item-list">
          <template v-for="cat in categoryTree" :key="cat.id">
            <div class="list-item" :style="{ marginLeft: (cat.depth * 20) + 'px' }">
              <span class="item-icon">
                <ChevronRightIcon :size="14" v-if="cat.depth > 0" />
                <FolderIcon :size="14" v-else />
              </span>
              <span class="item-name">{{ cat.name }}</span>
              <button class="icon-btn-small" @click="openModal(cat)" title="Editar">
                 <EditIcon :size="14" />
              </button>
            </div>
          </template>
          <div v-if="categories.length === 0" class="text-center py-20 text-muted">
            Sin categorías.
          </div>
        </div>
      </section>

      <!-- Tags Panel -->
      <section class="card">
        <div class="section-header">
          <span class="header-icon"><TagIcon :size="18" /></span>
          <div>
            <h3>Etiquetas</h3>
            <p>Tags para mejorar el filtrado SEO</p>
          </div>
        </div>

        <div class="quick-form">
          <div class="form-group mb-0">
            <label>Nombre del Tag</label>
            <div class="input-with-button">
              <input v-model="tagName" placeholder="Ej: Oferta" @keyup.enter="createTag" />
              <button class="primary small" @click="createTag">Añadir</button>
            </div>
          </div>
        </div>

        <div class="item-list mt-24">
          <div v-for="tag in tags" :key="tag.id" class="list-item">
            <span class="item-icon"><HashIcon :size="14" /></span>
            <span class="item-name">{{ tag.name }}</span>
            <span class="item-slug">{{ tag.slug }}</span>
          </div>
          <div v-if="tags.length === 0" class="text-center py-20 text-muted">
            Sin etiquetas.
          </div>
        </div>
      </section>
    </div>

    <!-- Category Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ form.id ? 'Editar Categoría' : 'Nueva Categoría' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <div class="modal-tabs">
          <button :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">General</button>
          <button :class="{ active: activeTab === 'seo' }" @click="activeTab = 'seo'">SEO</button>
        </div>

        <div class="modal-body">
          <div v-if="activeTab === 'general'" class="form-grid">
            <div class="form-group">
              <label>Nombre</label>
              <input v-model="form.name" placeholder="Nombre de la categoría" />
            </div>
            <div class="form-group">
              <label>Categoría Padre</label>
              <select v-model="form.parentId">
                <option :value="null">Ninguna (Nivel superior)</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id" :disabled="cat.id === form.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div class="form-group span-2">
              <label>Descripción (Visible en web)</label>
              <textarea v-model="form.description" rows="3" placeholder="Descripción corta para la cabecera de la página"></textarea>
            </div>
          </div>

          <div v-if="activeTab === 'seo'" class="form-grid">
            <div class="form-group">
               <label>Slug (URL)</label>
               <input v-model="form.slug" placeholder="url-amigable" />
            </div>
            <div class="form-group">
               <label>Meta Title</label>
               <input v-model="form.seoTitle" placeholder="Título para Google" />
            </div>
            <div class="form-group span-2">
               <label>Meta Keywords</label>
               <input v-model="form.seoKeywords" placeholder="palabra1, palabra2..." />
            </div>
             <div class="form-group span-2">
              <label>Meta Description</label>
              <textarea v-model="form.seoDescription" rows="3" placeholder="Descripción para resultados de búsqueda"></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="secondary" @click="closeModal">Cancelar</button>
          <button class="primary" @click="saveCategory">Guardar Cambios</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import api from "../api.js";
import { useToastStore } from "../stores/toast.js";
import { 
  FolderIcon, 
  TagIcon, 
  ChevronRightIcon, 
  HashIcon,
  EditIcon
} from "lucide-vue-next";

const categories = ref([]);
const tags = ref([]);
const tagName = ref("");
const store = useToastStore();

const showModal = ref(false);
const activeTab = ref('general');
const form = ref({
  id: null,
  name: "",
  parentId: null,
  description: "",
  slug: "",
  seoTitle: "",
  seoKeywords: "",
  seoDescription: ""
});

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

async function load() {
  const [cats, tagsResp] = await Promise.all([api.get("/categories"), api.get("/tags")]);
  categories.value = cats.data;
  tags.value = tagsResp.data;
}

function openModal(cat = null) {
  if (cat) {
    form.value = { 
      id: cat.id, 
      name: cat.name, 
      parentId: cat.parent_id,
      description: cat.description || "",
      slug: cat.slug || "",
      seoTitle: cat.seo_title || "",
      seoKeywords: cat.seo_keywords || "",
      seoDescription: cat.seo_description || ""
    };
  } else {
    form.value = { id: null, name: "", parentId: null, description: "", slug: "", seoTitle: "", seoKeywords: "", seoDescription: "" };
  }
  activeTab.value = 'general';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function saveCategory() {
  if (!form.value.name) return;
  try {
    const payload = {
      name: form.value.name,
      parentId: form.value.parentId,
      description: form.value.description,
      slug: form.value.slug,
      seoTitle: form.value.seoTitle,
      seoKeywords: form.value.seoKeywords,
      seoDescription: form.value.seoDescription
    };

    if (form.value.id) {
       await api.put(`/categories/${form.value.id}`, payload);
       store.success("Categoría actualizada");
    } else {
       await api.post("/categories", payload);
       store.success("Categoría creada");
    }
    closeModal();
    await load();
  } catch (err) {
    store.error(err.response?.data?.error || "Error al guardar");
  }
}

async function createTag() {
  if (!tagName.value) return;
  try {
    await api.post("/tags", { name: tagName.value });
    tagName.value = "";
    store.success("Etiqueta añadida");
    await load();
  } catch (err) {
    store.error("Error al crear la etiqueta");
  }
}

onMounted(load);
</script>

<style scoped>
.mt-24 { margin-top: 24px; }
.mb-0 { margin-bottom: 0; }
.py-20 { padding: 20px 0; }
.ml-auto { margin-left: auto; }
.text-center { text-align: center; }

.admin-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 24px;
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

.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.list-item:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.item-icon {
  display: flex;
  align-items: center;
  color: var(--primary);
}

.item-name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.icon-btn-small {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  display: flex;
  align-items: center;
}

.icon-btn-small:hover {
  color: var(--primary);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: white;
  width: 500px;
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.modal-header h3 { margin: 0; font-size: 18px; }

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
}

.modal-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 16px;
}

.modal-tabs button {
  background: none;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.modal-tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.span-2 {
  grid-column: span 2;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.input-with-button {
  display: flex;
  gap: 10px;
}
.input-with-button input {
  flex: 1;
}

.form-group {
    margin-bottom: 0 !important;
}
.form-group label {
    margin-bottom: 8px;
}
</style>
