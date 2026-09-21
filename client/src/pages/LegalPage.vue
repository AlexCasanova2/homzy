<template>
  <div class="legal-page section reveal">
    <div class="container container--narrow">
      <header class="legal-header">
        <h1>{{ title }}</h1>
        <p class="text-muted">Última actualización: {{ lastUpdate }}</p>
      </header>

      <div class="legal-content card glass">
        <div v-if="title === 'Política de Privacidad'">
          <h2>1. Responsable y contacto</h2>
          <p>Homzy es responsable de los tratamientos descritos en esta política. Para consultas sobre privacidad o para ejercer sus derechos puede escribir a <a href="mailto:contacto@homzy.es">contacto@homzy.es</a>.</p>

          <h2>2. Datos y finalidades</h2>
          <ul>
            <li><strong>Newsletter:</strong> tratamos el correo facilitado voluntariamente para enviar novedades y análisis. La base jurídica es el consentimiento y puede retirarlo en cualquier momento.</li>
            <li><strong>Analítica:</strong> Google Analytics se carga únicamente si acepta las cookies de analítica. Permite conocer páginas visitadas, dispositivo, ubicación aproximada e interacciones.</li>
            <li><strong>Publicidad:</strong> Google AdSense puede tratar identificadores, información del dispositivo e interacciones para mostrar y medir anuncios conforme a las preferencias expresadas en la CMP de Google.</li>
            <li><strong>Métricas propias:</strong> registramos página, artículo, tipo de evento, procedencia y fecha para medir lecturas y clics de afiliación. No guardamos IP ni agente de usuario en la tabla de métricas.</li>
            <li><strong>Seguridad:</strong> el alojamiento puede procesar temporalmente IP, agente de usuario y registros técnicos para servir el sitio, evitar abusos y diagnosticar errores.</li>
          </ul>

          <h2>3. Destinatarios y transferencias</h2>
          <p>Utilizamos proveedores de alojamiento y base de datos, además de Google Analytics y Google AdSense. Google puede tratar datos fuera del Espacio Económico Europeo aplicando los mecanismos y garantías descritos en su <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">política de privacidad</a>.</p>

          <h2>4. Conservación</h2>
          <p>Los datos se conservan durante el tiempo necesario para cada finalidad y para atender obligaciones legales. Los correos permanecen hasta que se solicite la baja. Los plazos de las cookies se detallan en la <RouterLink to="/cookies">Política de Cookies</RouterLink>. La retención de Google Analytics se configura desde su servicio.</p>

          <h2>5. Enlaces de afiliación</h2>
          <p>Homzy participa en el Programa de Afiliados de Amazon. En calidad de Afiliado de Amazon, obtenemos ingresos por las compras que cumplen los requisitos. Podemos recibir una comisión cuando compra mediante nuestros enlaces, sin coste adicional para usted. Esta relación comercial no modifica el precio ni garantiza una recomendación favorable.</p>

          <h2>6. Sus derechos</h2>
          <p>Puede solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar su consentimiento, escribiendo a <a href="mailto:contacto@homzy.es">contacto@homzy.es</a>. También puede presentar una reclamación ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p>
        </div>

        <div v-else-if="title === 'Política de Cookies'">
          <p>Esta política explica qué cookies y tecnologías similares puede utilizar Homzy, para qué sirven y cómo puede aceptar, rechazar o retirar su consentimiento.</p>

          <h2>1. Qué son las cookies</h2>
          <p>Son pequeños archivos o identificadores que un sitio y sus proveedores almacenan o consultan en el dispositivo. El almacenamiento local del navegador cumple funciones similares y se somete a las mismas preferencias cuando su finalidad no es estrictamente necesaria.</p>

          <h2>2. Cómo gestionamos el consentimiento</h2>
          <p>Usamos la CMP de Google, certificada para el marco IAB TCF. En España, el almacenamiento de analítica y publicidad parte de un estado denegado. Google Analytics no se descarga hasta que se acepta expresamente la finalidad de analítica.</p>
          <p>Puede aceptar, no consentir o configurar las finalidades desde el primer mensaje. Rechazar no impide navegar por Homzy. Puede cambiar su elección en cualquier momento:</p>
          <p><button type="button" class="cookie-settings-button" @click="configureCookies">Configurar cookies</button></p>

          <h2>3. Cookies y almacenamiento utilizados</h2>
          <div class="legal-table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duración orientativa</th></tr></thead>
              <tbody>
                <tr><td><code>FCCDCF</code>, <code>FCNEC</code> y señales TCF</td><td>Google CMP</td><td>Guardar las preferencias de privacidad y demostrar la elección realizada.</td><td>Hasta 13 meses</td></tr>
                <tr><td><code>_ga</code>, <code>_ga_*</code></td><td>Google Analytics</td><td>Distinguir sesiones y elaborar estadísticas de uso. Solo tras consentimiento.</td><td>Hasta 2 años</td></tr>
                <tr><td><code>__gads</code>, <code>__gpi</code></td><td>Google AdSense</td><td>Mostrar, limitar y medir anuncios conforme a las preferencias.</td><td>Hasta 13 meses</td></tr>
                <tr><td><code>__eoi</code></td><td>Google AdSense</td><td>Entrega y medición de publicidad.</td><td>Hasta 6 meses</td></tr>
                <tr><td><code>token</code>, <code>user</code></td><td>Homzy</td><td>Autenticación del área administrativa; no se utiliza para visitantes.</td><td>Hasta cerrar sesión o borrarlo</td></tr>
                <tr><td><code>homzy.admin.*</code></td><td>Homzy</td><td>Recordar preferencias funcionales de paginación del administrador.</td><td>Persistente hasta borrado</td></tr>
              </tbody>
            </table>
          </div>
          <p>La lista refleja las tecnologías previstas en la fecha de actualización. Google puede adaptar nombres o duraciones según el servicio, el navegador y la elección del usuario. Puede consultar también la información de <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">Google sobre sus cookies</a>.</p>

          <h2>4. Tipos de cookies</h2>
          <ul>
            <li><strong>Necesarias:</strong> permiten recordar la elección de privacidad y proteger las funciones esenciales. No se usan para publicidad.</li>
            <li><strong>Analítica:</strong> ayudan a comprender el uso del sitio. Requieren consentimiento.</li>
            <li><strong>Publicidad:</strong> permiten mostrar y medir anuncios, personalizados o no personalizados según la elección realizada. Requieren consentimiento cuando la normativa lo exige.</li>
          </ul>

          <h2>5. Cómo borrar cookies</h2>
          <p>Además del panel de configuración, puede borrar o bloquear cookies desde los ajustes de su navegador. Si elimina la cookie que conserva su elección, el mensaje de consentimiento puede volver a mostrarse.</p>
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

          <h2>5. Enlaces de Afiliación</h2>
          <p>Homzy participa en el Programa de Afiliados de Amazon. En calidad de Afiliado de Amazon, obtenemos ingresos por las compras que cumplen los requisitos. Algunos enlaces llevan a Amazon u otros comercios y pueden generar una comisión para Homzy, sin coste adicional para usted. Los precios, la disponibilidad, la entrega y la venta dependen del comercio externo.</p>
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
import { watch } from "vue";
import { RouterLink } from "vue-router";
import { ArrowLeftIcon } from "lucide-vue-next";
import { useToastStore } from "../stores/toast.js";
import { openCookieSettings } from "../consent.js";

const props = defineProps({
  title: { type: String, default: "Política de Privacidad" },
  lastUpdate: { type: String, default: "Septiembre 2026" }
});

const toast = useToastStore();

const metadata = {
  "Política de Privacidad": "Cómo trata Homzy los datos personales, las métricas, la publicidad y las suscripciones.",
  "Política de Cookies": "Cookies utilizadas por Homzy, sus finalidades y cómo aceptar, rechazar o retirar el consentimiento.",
  "Términos de Servicio": "Condiciones de uso, afiliación y responsabilidades aplicables al contenido de Homzy.",
};

watch(() => props.title, (title) => {
  document.querySelectorAll('[data-homzy-article-meta="true"]').forEach((element) => element.remove());
  const slug = title === "Política de Privacidad" ? "privacidad" : title === "Política de Cookies" ? "cookies" : "terminos";
  const description = metadata[title];
  document.title = `${title} | Homzy`;

  const meta = document.createElement("meta");
  meta.name = "description";
  meta.content = description;
  meta.dataset.homzyArticleMeta = "true";
  document.head.appendChild(meta);

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = `https://homzy.es/${slug}`;
  canonical.dataset.homzyArticleMeta = "true";
  document.head.appendChild(canonical);
}, { immediate: true });

function configureCookies() {
  if (!openCookieSettings()) {
    toast.info("La configuración estará disponible cuando Google active el mensaje de consentimiento.");
  }
}
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

.legal-content ul { margin: 0 0 20px 22px; }
.legal-content li { margin-bottom: 10px; }
.legal-content a { color: var(--primary); text-decoration: underline; }

.legal-table-wrap { margin: 20px 0; overflow-x: auto; }
.legal-content table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 14px; }
.legal-content th,
.legal-content td { padding: 12px; border: 1px solid var(--border); text-align: left; vertical-align: top; }
.legal-content th { background: var(--background); }

.cookie-settings-button {
  padding: 10px 16px;
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.cookie-settings-button:hover { background: var(--primary); color: white; }

.legal-footer {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

@media (max-width: 640px) {
  .legal-page { padding: 36px 0; }
  .legal-header { margin-bottom: 24px; }
  .legal-header h1 { font-size: 30px; }
  .legal-content { padding: 24px 18px; }
}
</style>
