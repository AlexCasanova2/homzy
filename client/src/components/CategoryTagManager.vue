<template>
  <div class="taxonomy-manager">
    <div class="admin-panels">
      <section class="card">
        <div class="section-header">
          <span class="header-icon"><FolderIcon :size="18" /></span>
          <div>
            <h3>Categorías</h3>
            <p>Organiza tus productos por tipo</p>
          </div>
        </div>

        <div class="quick-form">
          <div class="form-grid-mini">
            <div class="form-group mb-0">
              <label>Nombre de Categoría</label>
              <input v-model="categoryName" placeholder="Ej: Hogar Inteligente" @keyup.enter="createCategory" />
            </div>
            <div class="form-group mb-0">
              <label>Categoría Padre</label>
              <select v-model="categoryParentId">
                <option value="">Ninguna (Nivel superior)</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <button class="primary small btn-block" @click="createCategory">Añadir Categoría</button>
          </div>
        </div>

        <div class="item-list mt-24">
          <template v-for="cat in categoryTree" :key="cat.id">
            <div class="list-item" :style="{ marginLeft: (cat.depth * 20) + 'px' }">
              <span class="item-icon">
                <ChevronRightIcon :size="14" v-if="cat.depth > 0" />
                <FolderIcon :size="14" v-else />
              </span>
              <span class="item-name">{{ cat.name }}</span>
              <span class="item-slug">{{ cat.slug }}</span>
            </div>
          </template>
          <div v-if="categories.length === 0" class="text-center py-20 text-muted">
            Sin categorías.
          </div>
        </div>
      </section>

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
  </div>
</template>

<style scoped>
.mt-24 { margin-top: 24px; }
.mb-0 { margin-bottom: 0; }
.py-20 { padding: 20px 0; }
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

.form-grid-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: flex-end;
}

.btn-block {
  grid-column: span 2;
  height: 40px;
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
  background: #fff;
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

.item-slug {
  font-size: 12px;
  color: var(--text-muted);
  font-family: monospace;
}
</style>

<script setup>
import { onMounted, ref, computed } from "vue";
import api from "../api.js";
import { useToastStore } from "../stores/toast.js";
import { 
  FolderIcon, 
  TagIcon, 
  ChevronRightIcon, 
  HashIcon 
} from "lucide-vue-next";

const categories = ref([]);
const tags = ref([]);
const categoryName = ref("");
const categoryParentId = ref("");
const tagName = ref("");
const store = useToastStore();

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

async function createCategory() {
  if (!categoryName.value) return;
  try {
    await api.post("/categories", { 
      name: categoryName.value,
      parentId: categoryParentId.value || null
    });
    categoryName.value = "";
    categoryParentId.value = "";
    store.success("Categoría creada con éxito");
    await load();
  } catch (err) {
    store.error("Error al crear la categoría");
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
