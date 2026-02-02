<template>
  <div class="admin-layout">
    <aside class="admin-sidebar glass">
      <div class="admin-brand">
        <div class="brand__logo">H</div>
        <div class="brand__info">
          <span class="brand__eyebrow">Admin Panel</span>
          <h3 class="brand__title">Homzy</h3>
        </div>
      </div>
      
      <nav class="admin-nav">
        <RouterLink class="nav-item" :class="{ active: isActive('/admin') }" to="/admin">
          <span class="nav-icon"><LayoutDashboardIcon :size="20" /></span>
          Dashboard
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/articles') }" to="/admin/articles">
          <span class="nav-icon"><FileTextIcon :size="20" /></span>
          Articulos
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/products') }" to="/admin/products">
          <span class="nav-icon"><PackageIcon :size="20" /></span>
          Productos
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/categories') }" to="/admin/categories">
          <span class="nav-icon"><FolderIcon :size="20" /></span>
          Categorias
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/affiliates') }" to="/admin/affiliates">
          <span class="nav-icon"><UsersIcon :size="20" /></span>
          Afiliados
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/newsletter') }" to="/admin/newsletter">
          <span class="nav-icon"><MailIcon :size="20" /></span>
          Newsletter
        </RouterLink>
      </nav>

      <div class="admin-footer">
        <RouterLink class="nav-item secondary" to="/">
          <span class="nav-icon"><ExternalLinkIcon :size="18" /></span>
          Ver Web Pública
        </RouterLink>
        <button class="nav-item secondary logout-btn" @click="handleLogout">
          <span class="nav-icon"><LogOutIcon :size="18" /></span>
          Cerrar Sesión
        </button>
        <div class="help-card card">
          <p>¿Necesitas ayuda?</p>
          <button class="secondary small">Guía SEO</button>
        </div>
      </div>
    </aside>

    <div class="admin-main">
      <div class="admin-scroll-area">
        <section class="admin-content">
          <RouterView />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { 
  LayoutDashboardIcon, 
  FileTextIcon, 
  PackageIcon, 
  FolderIcon, 
  UsersIcon, 
  ExternalLinkIcon,
  MailIcon,
  LogOutIcon
} from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
  auth.logout();
  router.push("/login");
}

function isActive(path) {
  return path === "/admin" ? route.path === "/admin" : route.path.startsWith(path);
}

const currentPage = computed(() => {
  const parts = route.path.split('/').filter(Boolean);
  return parts.length > 1 ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Dashboard';
});

const currentPageTitle = computed(() => {
  const map = {
    '/admin': 'Resumen General',
    '/admin/articles': 'Gestión de Artículos',
    '/admin/products': 'Catálogo de Productos',
    '/admin/categories': 'Taxonomías',
    '/admin/affiliates': 'Redes de Afiliación',
    '/admin/newsletter': 'Gestión de Newsletter'
  };
  return map[route.path] || 'Admin';
});
</script>
