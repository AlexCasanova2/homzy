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
        <!-- Las etiquetas van en <span>: a ≤1024px la barra colapsa a solo iconos
             ocultando `span:not(.nav-icon)`, y un nodo de texto suelto no se puede ocultar. -->
        <RouterLink class="nav-item" :class="{ active: isActive('/admin') }" to="/admin" title="Dashboard">
          <span class="nav-icon"><LayoutDashboardIcon :size="20" /></span>
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/analytics') }" to="/admin/analytics" title="Analitica">
          <span class="nav-icon"><BarChart3Icon :size="20" /></span>
          <span>Analitica</span>
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/articles') }" to="/admin/articles" title="Articulos">
          <span class="nav-icon"><FileTextIcon :size="20" /></span>
          <span>Articulos</span>
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/products') }" to="/admin/products" title="Productos">
          <span class="nav-icon"><PackageIcon :size="20" /></span>
          <span>Productos</span>
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/categories') }" to="/admin/categories" title="Categorias">
          <span class="nav-icon"><FolderIcon :size="20" /></span>
          <span>Categorias</span>
        </RouterLink>
        <RouterLink class="nav-item" :class="{ active: isActive('/admin/newsletter') }" to="/admin/newsletter" title="Newsletter">
          <span class="nav-icon"><MailIcon :size="20" /></span>
          <span>Newsletter</span>
        </RouterLink>
      </nav>

      <div class="admin-footer">
        <a class="nav-item secondary" href="/" target="_blank" rel="noopener" title="Ver Web Pública">
          <span class="nav-icon"><ExternalLinkIcon :size="18" /></span>
          <span>Ver Web Pública</span>
        </a>
        <button class="nav-item secondary logout-btn" @click="handleLogout" title="Cerrar Sesión">
          <span class="nav-icon"><LogOutIcon :size="18" /></span>
          <span>Cerrar Sesión</span>
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
  BarChart3Icon,
  FileTextIcon,
  PackageIcon, 
  FolderIcon, 
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
    '/admin/analytics': 'Analítica',
    '/admin/articles': 'Gestión de Artículos',
    '/admin/products': 'Catálogo de Productos',
    '/admin/categories': 'Taxonomías',
    '/admin/newsletter': 'Gestión de Newsletter'
  };
  return map[route.path] || 'Admin';
});
</script>
