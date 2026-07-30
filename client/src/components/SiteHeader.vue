<template>
  <header class="site-header">
    <div class="container header-row">
      <RouterLink to="/" class="brand">
        <div class="brand__logo">H</div>
        <span class="brand__name">Homzy</span>
      </RouterLink>

      <nav class="main-nav" aria-label="Navegación principal">
        <RouterLink to="/" class="nav-link">Inicio</RouterLink>

        <div class="nav-dropdown" ref="dropdownRef">
          <button
            type="button"
            class="nav-link nav-trigger"
            :class="{ open: menuOpen, active: isCategoryRoute }"
            :aria-expanded="menuOpen"
            aria-controls="categories-menu"
            @click="toggleMenu"
          >
            Categorías
            <ChevronDownIcon :size="15" class="chevron" />
          </button>

          <div v-if="menuOpen" id="categories-menu" class="dropdown-panel">
            <div class="dropdown-body">
              <div class="dropdown-main">
                <p class="dropdown-label">Explora por categoría</p>

                <div v-if="tree.length" class="dropdown-grid">
                  <div v-for="cat in tree" :key="cat.id" class="dropdown-col">
                    <RouterLink class="dropdown-parent" :to="`/categoria/${cat.slug}`">
                      <span class="dropdown-parent-name">{{ cat.name }}</span>
                      <ArrowRightIcon :size="13" class="dropdown-parent-arrow" />
                    </RouterLink>
                    <RouterLink
                      v-for="child in cat.children"
                      :key="child.id"
                      class="dropdown-child"
                      :to="`/categoria/${child.slug}`"
                    >{{ child.name }}</RouterLink>
                  </div>
                </div>
                <p v-else class="dropdown-loading">Cargando categorías...</p>
              </div>

              <aside class="dropdown-aside">
                <p class="dropdown-label">Últimos análisis</p>

                <div v-if="latestArticles.length" class="latest-list">
                  <RouterLink
                    v-for="article in latestArticles"
                    :key="article.id"
                    class="latest-item"
                    :to="`/analisis/${article.slug}`"
                  >
                    <span class="latest-thumb">
                      <img v-if="article.image_url" :src="article.image_url" :alt="article.title" loading="lazy" />
                    </span>
                    <span class="latest-title">{{ shortTitle(article.title) }}</span>
                  </RouterLink>
                </div>
                <p v-else class="dropdown-loading">Cargando análisis...</p>
              </aside>
            </div>

            <RouterLink to="/categorias" class="dropdown-footer">
              Ver todas las categorías
              <ArrowRightIcon :size="14" />
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="header-actions">
        <form class="header-search" role="search" @submit.prevent="submitSearch">
          <label class="sr-only" for="header-search">Buscar artículos</label>
          <SearchIcon :size="16" class="search-icon" />
          <input id="header-search" v-model="searchQuery" type="search" placeholder="Buscar análisis..." />
        </form>

        <!-- Cuando no cabe el campo, el icono lleva a la página de búsqueda en lugar de no hacer nada. -->
        <RouterLink to="/buscar" class="icon-button search-toggle" aria-label="Buscar">
          <SearchIcon :size="18" />
        </RouterLink>

        <RouterLink v-if="auth.isAuthenticated" to="/admin" class="primary small admin-link">Admin</RouterLink>

        <button
          class="icon-button mobile-menu-button"
          type="button"
          aria-label="Abrir menú"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-navigation"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <XIcon v-if="mobileMenuOpen" :size="20" />
          <MenuIcon v-else :size="20" />
        </button>
      </div>
    </div>

    <nav v-if="mobileMenuOpen" id="mobile-navigation" class="mobile-nav container" aria-label="Navegación móvil">
      <form class="mobile-search" role="search" @submit.prevent="submitSearch">
        <label class="sr-only" for="mobile-search-input">Buscar artículos</label>
        <SearchIcon :size="16" class="search-icon" />
        <input id="mobile-search-input" v-model="searchQuery" type="search" placeholder="Buscar análisis..." />
      </form>

      <RouterLink to="/" class="mobile-link">Inicio</RouterLink>
      <RouterLink to="/categorias" class="mobile-link">Todas las categorías</RouterLink>

      <p class="mobile-section-label">Categorías</p>
      <RouterLink
        v-for="cat in tree"
        :key="cat.id"
        :to="`/categoria/${cat.slug}`"
        class="mobile-link mobile-link--category"
      >{{ cat.name }}</RouterLink>
    </nav>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ArrowRightIcon, ChevronDownIcon, MenuIcon, SearchIcon, XIcon } from "lucide-vue-next";
import api from "../api.js";
import { useAuthStore } from "../stores/auth.js";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const categories = ref([]);
const latestArticles = ref([]);
const menuOpen = ref(false);
const mobileMenuOpen = ref(false);
const searchQuery = ref("");
const dropdownRef = ref(null);

const tree = computed(() => {
  const byId = {};
  categories.value.forEach((cat) => {
    byId[cat.id] = { ...cat, children: [] };
  });
  const roots = [];
  categories.value.forEach((cat) => {
    const node = byId[cat.id];
    if (cat.parent_id && byId[cat.parent_id]) byId[cat.parent_id].children.push(node);
    else roots.push(node);
  });
  return roots;
});

const isCategoryRoute = computed(() => route.path.startsWith("/categoria"));

async function loadCategories() {
  try {
    const { data } = await api.get("/categories");
    categories.value = data;
  } catch {
    // Un fallo aquí no debe romper la cabecera: el enlace "Todas" sigue funcionando.
    categories.value = [];
  }
}

// Los análisis destacados se piden al abrir el menú por primera vez, no en cada carga de
// página: el listado de artículos incluye el HTML completo y no merece ese coste de entrada.
async function toggleMenu() {
  menuOpen.value = !menuOpen.value;
  if (!menuOpen.value || latestArticles.value.length) return;
  try {
    const { data } = await api.get("/articles");
    latestArticles.value = data.slice(0, 3);
  } catch {
    latestArticles.value = [];
  }
}

// Los títulos arrastran el nombre completo del producto de Amazon y en el rail se cortaban
// a mitad de palabra. Nos quedamos con el primer tramo (antes de « – », « | » o « : »),
// que es el nombre del producto, y solo recortamos si aun así se pasa de largo.
function shortTitle(title) {
  const head = String(title || "").split(/\s+[–—|]\s+|:\s+/)[0].trim();
  return head.length > 64 ? `${head.slice(0, 62).trimEnd()}…` : head;
}

function submitSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;
  router.push({ path: "/buscar", query: { q: query } });
  mobileMenuOpen.value = false;
}

function onDocumentClick(event) {
  if (menuOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    menuOpen.value = false;
  }
}

function onKeydown(event) {
  if (event.key !== "Escape") return;
  menuOpen.value = false;
  mobileMenuOpen.value = false;
}

// Navegar cierra cualquier menú abierto: si no, el desplegable tapa la página nueva.
watch(() => route.fullPath, () => {
  menuOpen.value = false;
  mobileMenuOpen.value = false;
});

onMounted(() => {
  loadCategories();
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
/* --- Navegación principal --- */
.main-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 15px;
  color: var(--secondary);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-link:hover {
  background: var(--primary-light);
  color: var(--primary);
}

/* Marca dónde estás: sin esto la cabecera no da sensación de sitio. */
.nav-link.router-link-exact-active,
.nav-link.active,
.nav-link.open {
  color: var(--primary);
  background: var(--primary-light);
}

.chevron {
  transition: transform 0.18s ease;
}

.nav-trigger.open .chevron {
  transform: rotate(180deg);
}

/* --- Desplegable de categorías --- */
/* Estático a propósito: así el panel se ancla a .site-header (sticky) y no al botón,
   que según el ancho queda descentrado y hacía desbordar el panel fuera del viewport. */
.nav-dropdown {
  position: static;
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  width: min(1320px, calc(100vw - 40px));
  margin-top: 12px;
  padding: 32px 40px 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: dropdown-in 0.16s ease-out;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.dropdown-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 36px;
}

.dropdown-aside {
  padding-left: 36px;
  border-left: 1px solid var(--border);
}

.dropdown-label {
  margin-bottom: 18px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
}

/* auto-fit con un mínimo medido, no estimado: el nombre más largo ("Grandes
   electrodomésticos") pide 216px de texto y la fila gasta 41px en padding, hueco y flecha.
   Con 260px de mínimo ningún nombre se parte en dos líneas, y la rejilla decide sola
   cuántas columnas caben según el ancho disponible. */
.dropdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px 18px;
  align-items: start;
}

.dropdown-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dropdown-parent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.25;
  color: var(--text);
  /* Si un nombre no cabe, reparte las líneas en bloques parejos en lugar de dejar
     una línea larga y una huérfana de dos palabras. */
  text-wrap: balance;
  transition: background 0.16s ease, color 0.16s ease;
}

.dropdown-parent:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.dropdown-parent-arrow {
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.dropdown-parent:hover .dropdown-parent-arrow {
  opacity: 1;
  transform: translateX(0);
}

.dropdown-child {
  padding: 5px 10px 5px 12px;
  margin-left: 10px;
  border-left: 2px solid var(--border);
  font-size: 13.5px;
  line-height: 1.35;
  color: var(--text-muted);
  transition: color 0.16s ease, border-color 0.16s ease;
}

.dropdown-child:hover {
  color: var(--primary);
  border-left-color: var(--primary);
}

/* --- Rail de últimos análisis --- */
.latest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.latest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: background 0.16s ease;
}

.latest-item:hover {
  background: var(--primary-light);
}

.latest-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--primary-light);
  border: 1px solid var(--border);
}

.latest-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.latest-title {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.latest-item:hover .latest-title {
  color: var(--primary);
}

.dropdown-footer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  font-weight: 700;
  font-size: 14px;
  color: var(--primary);
}

.dropdown-footer:hover {
  gap: 10px;
}

.dropdown-loading {
  font-size: 14px;
  color: var(--text-muted);
}

/* --- Buscador --- */
.header-search {
  position: relative;
  display: flex;
  align-items: center;
}

.header-search .search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.header-search input {
  width: min(240px, 22vw);
  padding: 9px 12px 9px 36px;
  font-size: 14px;
}

.search-toggle,
.mobile-menu-button {
  display: none;
}

/* --- Menú móvil --- */
.mobile-nav {
  display: none;
}

.mobile-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.mobile-search .search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.mobile-search input {
  width: 100%;
  padding: 10px 12px 10px 36px;
}

.mobile-link {
  display: block;
  padding: 11px 4px;
  font-weight: 600;
  color: var(--text);
  border-top: 1px solid var(--border);
}

.mobile-link--category {
  font-weight: 500;
  color: var(--text-muted);
  padding-left: 14px;
}

.mobile-section-label {
  margin: 14px 0 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@media (max-width: 1080px) {
  .dropdown-panel {
    padding: 26px 24px 20px;
  }

  /* Sin sitio para el rail lateral: las categorías se quedan con todo el ancho. */
  .dropdown-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }

  .dropdown-aside {
    padding-left: 0;
    padding-top: 22px;
    border-left: 0;
    border-top: 1px solid var(--border);
  }

  .latest-list {
    flex-direction: row;
  }

  .latest-item {
    flex: 1;
    align-items: flex-start;
    min-width: 0;
  }
}

@media (max-width: 860px) {
  .latest-list {
    flex-direction: column;
  }

  .latest-item {
    align-items: center;
  }
}

@media (max-width: 820px) {
  .header-search {
    display: none;
  }

  .search-toggle {
    display: flex;
  }
}

@media (max-width: 720px) {
  .main-nav {
    display: none;
  }

  .mobile-menu-button {
    display: flex;
  }

  .mobile-nav {
    display: block;
    padding-bottom: 16px;
  }

  .admin-link {
    display: none;
  }
}
</style>
