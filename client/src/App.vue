<template>
  <div class="app-shell">
    <header v-if="!isAdmin" class="site-header">
      <div class="container header-row">
        <RouterLink to="/" class="brand">
          <div class="brand__logo">H</div>
          <span class="brand__name">Homzy</span>
        </RouterLink>
        <nav class="main-nav" aria-label="Navegación principal">
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/categorias">Categorías</RouterLink>
        </nav>
        <div class="header-actions">
           <form v-if="searchOpen" class="header-search" role="search" @submit.prevent="submitSearch">
             <label class="sr-only" for="header-search">Buscar artículos</label>
             <input id="header-search" ref="searchInput" v-model="searchQuery" type="search" placeholder="Buscar artículos" />
           </form>
           <button class="icon-button" type="button" aria-label="Buscar" :aria-expanded="searchOpen" @click="toggleSearch">
             <SearchIcon :size="18" />
           </button>
           <button v-if="auth.isAuthenticated" class="primary small" @click="$router.push('/admin')">Admin</button>
           <button class="icon-button mobile-menu-button" type="button" aria-label="Abrir menú" :aria-expanded="mobileMenuOpen" aria-controls="mobile-navigation" @click="mobileMenuOpen = !mobileMenuOpen">
             <XIcon v-if="mobileMenuOpen" :size="20" />
             <MenuIcon v-else :size="20" />
           </button>
        </div>
      </div>
      <nav v-if="mobileMenuOpen" id="mobile-navigation" class="mobile-nav container" aria-label="Navegación móvil">
        <RouterLink to="/" @click="mobileMenuOpen = false">Inicio</RouterLink>
        <RouterLink to="/categorias" @click="mobileMenuOpen = false">Categorías</RouterLink>
        <RouterLink to="/buscar" @click="mobileMenuOpen = false">Buscar</RouterLink>
      </nav>
    </header>

    <main :class="{ 'site-main': !isAdmin, 'admin-full-width': isAdmin }">
      <RouterView />
    </main>

    <footer v-if="!isAdmin && !$route.path.includes('/login')" class="site-footer" id="sobre">
      <div class="container footer-grid">
        <div>
          <div class="brand">
            <div class="brand__logo">H</div>
            <span class="brand__name">Homzy</span>
          </div>
          <p class="footer-text">Ideas, comparativas y análisis editoriales para ayudarte a elegir productos para tu hogar.</p>
        </div>
        <div>
          <h4>Lector</h4>
          <ul class="footer-links">
            <li><RouterLink to="/privacidad">Privacidad</RouterLink></li>
            <li><RouterLink to="/terminos">Términos</RouterLink></li>
            <li><RouterLink to="/login" v-if="!auth.isAuthenticated">Acceso Staff</RouterLink></li>
          </ul>
        </div>
        <div>
          <h4>Newsletter</h4>
          <p class="footer-text">Recibe los últimos análisis en tu correo</p>
          <div class="newsletter">
            <input type="email" v-model="email" placeholder="tu@email.com" />
            <button class="icon-button" aria-label="Enviar" @click="subscribe">
              <SendIcon :size="18" />
            </button>
          </div>
        </div>
        <p class="affiliate-footer">Homzy participa en el Programa de Afiliados de Amazon. Podemos obtener una comisión por compras que cumplan los requisitos, sin coste adicional para ti.</p>
      </div>
      <div class="footer-bottom">© {{ new Date().getFullYear() }} Homzy. Todos los derechos reservados.</div>
    </footer>
    <ToastContainer />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { MenuIcon, SearchIcon, SendIcon, XIcon } from "lucide-vue-next";
import ToastContainer from "./components/ToastContainer.vue";
import { useAuthStore } from "./stores/auth.js";
import { useToastStore } from "./stores/toast.js";
import api from "./api.js";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();
const isAdmin = computed(() => route.path.includes('/admin'));
const email = ref("");
const searchOpen = ref(false);
const searchQuery = ref("");
const searchInput = ref(null);
const mobileMenuOpen = ref(false);

async function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    await nextTick();
    searchInput.value?.focus();
  }
}

function submitSearch() {
  const query = searchQuery.value.trim();
  if (!query) return;
  router.push({ path: "/buscar", query: { q: query } });
  searchOpen.value = false;
}

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false;
});

async function subscribe() {
  if (!email.value) return;
  try {
     await api.post("/newsletter/subscribe", { email: email.value });
     toast.success("¡Gracias por suscribirte!");
     email.value = "";
  } catch (e) {
     toast.error("Error al suscribirse");
  }
}
</script>

<style>
.admin-full-width {
  width: 100%;
  max-width: 100vw;
  margin: 0;
  padding: 0;
}

.header-actions, .header-search { display: flex; align-items: center; gap: 8px; }
.header-search input { width: min(260px, 35vw); padding: 8px 12px; }
.mobile-menu-button, .mobile-nav { display: none; }
.affiliate-footer { grid-column: 1 / -1; color: #cbd5e1; font-size: 12px; padding-top: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 720px) {
  .mobile-menu-button { display: flex; }
  .mobile-nav { display: grid; gap: 2px; padding-bottom: 14px; }
  .mobile-nav a { padding: 10px 4px; color: var(--text-muted); font-weight: 600; border-top: 1px solid var(--border); }
  .header-search { position: absolute; left: 16px; right: 16px; top: calc(100% + 8px); padding: 8px; background: white; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow); }
  .header-search input { width: 100%; }
}
</style>
