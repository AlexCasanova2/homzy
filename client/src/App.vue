<template>
  <div class="app-shell">
    <header v-if="!isAdmin" class="site-header">
      <div class="container header-row">
        <RouterLink to="/" class="brand">
          <div class="brand__logo">H</div>
          <span class="brand__name">Homzy</span>
        </RouterLink>
        <nav class="main-nav">
          <RouterLink to="/">Inicio</RouterLink>
          <RouterLink to="/categorias">Categorías</RouterLink>
        </nav>
        <div class="flex gap-2">
           <button class="icon-button" aria-label="Buscar">
             <SearchIcon :size="18" />
           </button>
           <button v-if="auth.isAuthenticated" class="primary small" @click="$router.push('/admin')">Admin</button>
        </div>
      </div>
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
          <p class="footer-text">
            Ideas y productos que simplifican tu vida. Descubre reseñas honestas y detalladas de los mejores productos para tu hogar.
          </p>
          <div class="socials">
            <span class="social"></span>
            <span class="social"></span>
            <span class="social"></span>
          </div>
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
          <p class="footer-text">Recibe las últimas reseñas en tu correo</p>
          <div class="newsletter">
            <input type="email" v-model="email" placeholder="tu@email.com" />
            <button class="icon-button" aria-label="Enviar" @click="subscribe">
              <SendIcon :size="18" />
            </button>
          </div>
        </div>
      </div>
      <div class="footer-bottom">© {{ new Date().getFullYear() }} Homzy. Todos los derechos reservados.</div>
    </footer>
    <ToastContainer />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { SearchIcon, SendIcon } from "lucide-vue-next";
import ToastContainer from "./components/ToastContainer.vue";
import { useAuthStore } from "./stores/auth.js";
import { useToastStore } from "./stores/toast.js";
import api from "./api.js";

const route = useRoute();
const auth = useAuthStore();
const toast = useToastStore();
const isAdmin = computed(() => route.path.includes('/admin'));
const email = ref("");

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
</style>
