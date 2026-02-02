<template>
  <div class="app-shell">
    <header v-if="!isAdmin" class="site-header">
      <div class="container header-row">
        <div class="brand">
          <div class="brand__logo">H</div>
          <span class="brand__name">Homzy</span>
        </div>
        <nav class="main-nav">
          <RouterLink to="/">Inicio</RouterLink>
          <a href="#categorias">Productos</a>
          <a href="#categorias">Categorias</a>
          <a href="#sobre">Sobre Nosotros</a>
        </nav>
        <button class="icon-button" aria-label="Buscar">
          <SearchIcon :size="18" />
        </button>
      </div>
    </header>

    <main :class="{ 'container': !isAdmin, 'admin-full-width': isAdmin }">
      <RouterView />
    </main>

    <footer v-if="!isAdmin" class="site-footer" id="sobre">
      <div class="container footer-grid">
        <div>
          <div class="brand">
            <div class="brand__logo">H</div>
            <span class="brand__name">Homzy</span>
          </div>
          <p class="footer-text">
            Ideas y productos que simplifican tu vida. Descubre resenas honestas y detalladas de los mejores productos para tu hogar.
          </p>
          <div class="socials">
            <span class="social"></span>
            <span class="social"></span>
            <span class="social"></span>
          </div>
        </div>
        <div>
          <h4>Enlaces Rapidos</h4>
          <ul class="footer-links">
            <li><a href="#">Inicio</a></li>
            <li><a href="#categorias">Productos</a></li>
            <li><a href="#categorias">Categorias</a></li>
            <li><a href="#sobre">Sobre Nosotros</a></li>
          </ul>
        </div>
        <div>
          <h4>Newsletter</h4>
          <p class="footer-text">Recibe las ultimas resenas en tu correo</p>
          <div class="newsletter">
            <input type="email" placeholder="tu@email.com" />
            <button class="icon-button" aria-label="Enviar">
              <SendIcon :size="18" />
            </button>
          </div>
        </div>
      </div>
      <div class="footer-bottom">© 2026 Homzy. Todos los derechos reservados.</div>
    </footer>
    <ToastContainer />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { SearchIcon, SendIcon } from "lucide-vue-next";
import ToastContainer from "./components/ToastContainer.vue";

const route = useRoute();
const isAdmin = computed(() => route.path.includes('/admin'));
</script>

<style>
.admin-full-width {
  width: 100%;
  max-width: 100vw;
  margin: 0;
  padding: 0;
}
</style>
