<template>
  <div class="legal-page section reveal">
    <div class="container container--narrow">
      <header class="legal-header">
        <h1>{{ title }}</h1>
        <p class="text-muted">Última actualización: {{ lastUpdate }}</p>
      </header>

      <div class="legal-content card glass">
        <div v-if="title === 'Política de Privacidad'">
          <h2>1. Información que Recopilamos</h2>
          <p>En Homzy, solo recopilamos la dirección de correo electrónico de los usuarios que deciden voluntariamente suscribirse a nuestro boletín de noticias.</p>
          
          <h2>2. Uso de la Información</h2>
          <p>Utilizamos su correo electrónico exclusivamente para enviarle actualizaciones, nuevas reseñas de productos y guías de compra relacionadas con el diseño y la tecnología del hogar.</p>
          
          <h2>3. Cookies y Seguimiento</h2>
          <p>Utilizamos herramientas como Google Tag Manager y Google Analytics para entender cómo los usuarios interactúan con nuestro sitio. Estas herramientas pueden recopilar datos técnicos como su dirección IP, tipo de navegador y páginas visitadas a través de cookies.</p>
          
          <h2>4. Enlaces de Afiliación</h2>
          <p>Homzy participa en programas de afiliados, como el de Amazon Services LLC. Esto significa que podemos recibir una comisión por las compras realizadas a través de nuestros enlaces, sin costo adicional para usted.</p>
          
          <h2>5. Sus Derechos</h2>
          <p>Usted puede darse de baja de nuestra lista de correo en cualquier momento enviando un correo a contacto@homzy.es o haciendo clic en el enlace de "cancelar suscripción" en nuestros correos.</p>
        </div>

        <div v-else-if="title === 'Términos de Servicio'">
          <h2>1. Aceptación de los Términos</h2>
          <p>Al acceder a Homzy, usted acepta estar sujeto a estos términos de servicio y a todas las leyes y reglamentos aplicables.</p>
          
          <h2>2. Uso de Contenido</h2>
          <p>Todo el contenido publicado en Homzy, incluyendo reseñas, imágenes (algunas generadas por IA o propiedad de marcas) y textos, es propiedad del sitio o se usa bajo licencia. No puede redistribuir este contenido sin permiso expreso.</p>
          
          <h2>3. Descargo de Responsabilidad</h2>
          <p>Las reseñas en Homzy se basan en nuestra opinión honesta y análisis técnico. Sin embargo, no garantizamos que los productos analizados cumplan con sus expectativas específicas. La compra final se realiza en sitios externos (como Amazon), y Homzy no es responsable de problemas con el envío o el producto físico.</p>
          
          <h2>4. Limitación de Responsabilidad</h2>
          <p>Homzy no será responsable de ningún daño que surja del uso o la imposibilidad de usar el contenido de este sitio.</p>
        </div>
      </div>

      <div class="legal-footer">
        <RouterLink to="/" class="btn-premium small">
          <ArrowLeftIcon :size="16" class="mr-8" />
          Volver al Inicio
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
import { ArrowLeftIcon } from "lucide-vue-next";

defineProps({
  title: { type: String, default: "Política de Privacidad" },
  lastUpdate: { type: String, default: "Febrero 2026" }
});
</script>

<style scoped>
.legal-page {
  padding: 60px 0;
  min-height: 80vh;
}

.container--narrow {
  max-width: 800px;
}

.legal-header {
  margin-bottom: 40px;
  text-align: center;
}

.legal-header h1 {
  font-family: 'Montserrat', sans-serif;
  font-size: 36px;
  margin-bottom: 12px;
}

.legal-content {
  padding: 48px;
  line-height: 1.8;
  color: var(--text);
}

.legal-content h2 {
  font-family: 'Montserrat', sans-serif;
  font-size: 22px;
  margin: 32px 0 16px;
  color: var(--primary);
}

.legal-content p {
  margin-bottom: 16px;
}

.legal-footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}
</style>
