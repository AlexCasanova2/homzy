<template>
  <article class="editorial-page section">
    <div class="container editorial-layout">
      <aside class="editorial-nav card" aria-label="Información editorial">
        <span class="eyebrow">Transparencia</span>
        <RouterLink to="/sobre">Sobre Homzy</RouterLink>
        <RouterLink to="/metodologia-editorial">Metodología editorial</RouterLink>
        <RouterLink to="/autoria">Autoría</RouterLink>
      </aside>

      <main class="editorial-content">
        <header>
          <span class="eyebrow">{{ page.eyebrow }}</span>
          <h1>{{ page.title }}</h1>
          <p class="lead">{{ page.description }}</p>
        </header>

        <section v-for="section in page.sections" :key="section.title">
          <h2>{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <ul v-if="section.items">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="contact-card card">
          <h2>Contacto y correcciones</h2>
          <p>Si detectas un dato incorrecto, un producto sustituido o una explicación mejorable, escríbenos a <a href="mailto:contacto@homzy.es">contacto@homzy.es</a>.</p>
        </section>
      </main>
    </div>
  </article>
</template>

<script setup>
import { computed, onUnmounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();
const pages = {
  "/sobre": {
    eyebrow: "Quiénes somos",
    title: "Sobre Homzy",
    description: "Homzy es una publicación independiente en español que analiza productos para el hogar y la tecnología doméstica antes de comprar.",
    sections: [
      { title: "Qué hacemos", paragraphs: ["Convertimos fichas técnicas extensas y mensajes comerciales en análisis claros sobre prestaciones, limitaciones y perfiles de uso. Priorizamos climatización, mascotas, limpieza y hogar inteligente."] },
      { title: "Independencia editorial", paragraphs: ["No aceptamos pagos para alterar una conclusión o esconder una limitación. La selección y el enfoque de cada contenido responden a su utilidad para el lector y a la información verificable disponible."] },
      { title: "Cómo se financia Homzy", paragraphs: ["Homzy participa en el Programa de Afiliados de Amazon. Si una persona compra mediante determinados enlaces, podemos recibir una comisión sin coste adicional para ella. La afiliación no modifica el precio ni determina nuestra valoración."] },
      { title: "Nuestro compromiso", items: ["Diferenciar especificaciones del fabricante de conclusiones editoriales.", "No presentar como prueba física un análisis documental.", "Mostrar contras y requisitos antes de recomendar.", "Corregir y actualizar información cuando cambia el producto o detectamos un error."] },
    ],
  },
  "/metodologia-editorial": {
    eyebrow: "Cómo trabajamos",
    title: "Metodología editorial",
    description: "Así seleccionamos, verificamos, comparamos y actualizamos los análisis publicados en Homzy.",
    sections: [
      { title: "Selección de productos", paragraphs: ["Elegimos productos relacionados con las áreas editoriales de Homzy y con dudas de compra concretas. Valoramos la demanda observada, la disponibilidad en España, la calidad de la ficha y la existencia de alternativas comparables."] },
      { title: "Fuentes y verificación", paragraphs: ["Partimos de la ficha vigente del producto, sus especificaciones, documentación del fabricante cuando está disponible y datos públicos del catálogo. Revisamos medidas, capacidad, compatibilidad, consumo, accesorios y requisitos; si los datos disponibles se contradicen, lo indicamos o evitamos afirmar el dato."] },
      { title: "Análisis documental y prueba física", paragraphs: ["La mayoría de contenidos son análisis documentales de especificaciones y no pruebas físicas. Solo hablamos de experiencia directa, mediciones propias o uso real cuando disponemos de esa evidencia y lo explicamos expresamente."] },
      { title: "Comparaciones y conclusiones", paragraphs: ["Comparamos productos reales mediante criterios relevantes para la decisión: capacidad, cobertura, compatibilidad, mantenimiento, consumo, accesorios y limitaciones. No tratamos rankings de ventas como pruebas de calidad ni presentamos estimaciones como mediciones propias."] },
      { title: "Herramientas y revisión", paragraphs: ["Podemos utilizar herramientas de automatización e inteligencia artificial para estructurar borradores y comprobar consistencia. Antes de publicar revisamos los datos principales, los enlaces y la estructura del contenido; el servidor también sanitiza el HTML y valida el enlace del producto."] },
      { title: "Actualizaciones", paragraphs: ["Revisamos contenidos cuando cambian precios orientativos, disponibilidad, modelos o consultas de búsqueda. La fecha de modificación indica el último cambio guardado en la página, que puede afectar al texto o a sus metadatos."] },
    ],
  },
  "/autoria": {
    eyebrow: "Responsabilidad editorial",
    title: "Equipo editorial de Homzy",
    description: "Los análisis se publican bajo la responsabilidad del equipo editorial de Homzy, sin atribuir experiencia personal a identidades ficticias.",
    sections: [
      { title: "Áreas de trabajo", paragraphs: ["El equipo organiza y revisa información sobre climatización, limpieza, mascotas y dispositivos conectados para el hogar. Su trabajo se centra en hacer comparables los datos que influyen en una compra."] },
      { title: "Responsabilidades", items: ["Revisar que las afirmaciones relevantes se apoyen en los datos disponibles del producto.", "Separar beneficios razonables de mensajes promocionales.", "Incluir limitaciones, requisitos y perfiles para los que un producto no encaja.", "Mantener enlaces, canónicas, metadatos y datos estructurados coherentes."] },
      { title: "Firma y transparencia", paragraphs: ["Usamos una firma editorial colectiva porque el proceso combina recopilación, estructuración y revisión. No atribuimos los textos a una persona inventada ni afirmamos haber probado un producto cuando el análisis es documental."] },
    ],
  },
};

const page = computed(() => pages[route.path] || pages["/sobre"]);

function clearMeta() {
  document.querySelectorAll('[data-homzy-article-meta="true"], [data-homzy-editorial-meta="true"]').forEach((element) => element.remove());
}

function addMeta(attribute, key, content) {
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  element.content = content;
  element.dataset.homzyEditorialMeta = "true";
  document.head.appendChild(element);
}

function updateMeta(current) {
  clearMeta();
  const canonical = `${window.location.origin}${route.path}`;
  const title = `${current.title} | Homzy`;
  document.title = title;
  addMeta("name", "description", current.description);
  addMeta("property", "og:title", title);
  addMeta("property", "og:description", current.description);
  addMeta("property", "og:type", "website");
  addMeta("property", "og:url", canonical);
  addMeta("name", "twitter:card", "summary");
  addMeta("name", "twitter:title", title);
  addMeta("name", "twitter:description", current.description);
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = canonical;
  link.dataset.homzyEditorialMeta = "true";
  document.head.appendChild(link);
}

watch(page, updateMeta, { immediate: true });
onUnmounted(clearMeta);
</script>

<style scoped>
.editorial-layout { display: grid; grid-template-columns: 240px minmax(0, 760px); justify-content: center; gap: 54px; align-items: start; }
.editorial-nav { position: sticky; top: 100px; display: grid; gap: 4px; padding: 20px; }
.editorial-nav .eyebrow { margin: 0 10px 10px; }
.editorial-nav a { padding: 10px; border-radius: 8px; color: var(--text-muted); font-weight: 600; }
.editorial-nav a.router-link-active { background: var(--primary-light); color: var(--primary); }
.editorial-content header { margin-bottom: 46px; }
.editorial-content h1 { margin: 8px 0 16px; font-size: clamp(38px, 6vw, 64px); line-height: 1.05; }
.editorial-content .lead { color: var(--secondary); font-size: 20px; line-height: 1.6; }
.editorial-content section { margin-bottom: 36px; }
.editorial-content h2 { margin-bottom: 12px; font-size: 25px; }
.editorial-content p, .editorial-content li { color: var(--secondary); font-size: 17px; line-height: 1.75; }
.editorial-content ul { padding-left: 22px; }
.editorial-content li { margin-bottom: 8px; }
.contact-card { padding: 26px; border-left: 4px solid var(--primary); }
.contact-card h2 { margin-top: 0; }
.eyebrow { color: var(--primary); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
@media (max-width: 820px) {
  .editorial-layout { grid-template-columns: 1fr; gap: 28px; }
  .editorial-nav { position: static; grid-template-columns: repeat(3, 1fr); }
  .editorial-nav .eyebrow { grid-column: 1 / -1; }
  .editorial-nav a { padding: 8px; font-size: 13px; text-align: center; }
}
</style>
