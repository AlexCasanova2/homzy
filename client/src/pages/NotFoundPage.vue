<template>
  <div class="not-found-page">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    
    <div class="container content-center reveal">
      <div class="error-illustration">
        <span class="error-code">404</span>
        <div class="icon-stack">
          <SearchIcon :size="80" class="search-icon" />
          <div class="bubble">?</div>
        </div>
      </div>

      <h1 class="error-title">¡Ups! Parece que este rincón no existe</h1>
      <p class="error-desc">
        Lo sentimos, no hemos podido encontrar la página que buscas. Tal vez el producto fue descatalogado o el enlace ha cambiado de dirección.
      </p>

      <div class="action-grid">
        <RouterLink to="/" class="btn-premium">
          <HomeIcon :size="18" class="mr-8" />
          Volver al Inicio
        </RouterLink>
        <RouterLink to="/categorias" class="btn-premium secondary">
          <GridIcon :size="18" class="mr-8" />
          Explorar Categorías
        </RouterLink>
      </div>

      <div class="search-suggestion">
        <p>¿Buscas algo específico?</p>
        <div class="hero-search mini">
          <input type="text" placeholder="Ej: Mejores aspiradoras..." />
          <button class="search-btn"><SearchIcon :size="18" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
import { SearchIcon, HomeIcon, LayoutGridIcon as GridIcon } from "lucide-vue-next";
import { onMounted } from "vue";

onMounted(() => {
  document.title = "404 - Página no encontrada | Homzy";
});
</script>

<style scoped>
.not-found-page {
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 60px 20px;
}

.content-center {
  max-width: 600px;
  text-align: center;
  position: relative;
  z-index: 10;
}

.error-illustration {
  margin-bottom: 40px;
  position: relative;
}

.error-code {
  font-family: 'Montserrat', sans-serif;
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  background: var(--user-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0.15;
  user-select: none;
}

.icon-stack {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -40%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  color: var(--primary);
  opacity: 0.8;
  animation: float 4s ease-in-out infinite;
}

.bubble {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 32px;
  height: 32px;
  background: var(--accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  animation: bounce 2s ease-in-out infinite;
}

.error-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  color: var(--text);
}

.error-desc {
  font-size: 18px;
  color: var(--text-muted);
  margin-bottom: 40px;
  line-height: 1.6;
}

.action-grid {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;
}

.search-suggestion {
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.search-suggestion p {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-muted);
}

.hero-search.mini {
  max-width: 400px;
  margin: 0 auto;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@media (max-width: 600px) {
  .error-code { font-size: 120px; }
  .action-grid { flex-direction: column; }
  .btn-premium { width: 100%; }
}
</style>
