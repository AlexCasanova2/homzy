<template>
  <div class="app-shell">
    <SiteHeader v-if="!isAdmin" />

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
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { SendIcon } from "lucide-vue-next";
import SiteHeader from "./components/SiteHeader.vue";
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

/* Los estilos de la cabecera viven en SiteHeader.vue. */
.header-actions { display: flex; align-items: center; gap: 8px; }
.affiliate-footer { grid-column: 1 / -1; color: #cbd5e1; font-size: 12px; padding-top: 8px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
