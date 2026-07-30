---
name: seo-articulo
description: Genera o mejora artículos de análisis/reseña de productos para Homzy (blog de afiliados de Amazon en español), en HTML listo para pegar en el editor del admin. Úsala siempre que el usuario pida redactar, generar, mejorar, reescribir u optimizar un artículo, reseña, análisis o comparativa de producto; pegue un JSON de producto (asin, title, price, rating, features, details); o hable de SEO de contenidos, textos de venta o artículos de afiliados — aunque no mencione la skill por su nombre.
---

# Artículos SEO para Homzy

Homzy (homzy.es) es un blog de afiliados de Amazon en español sobre hogar y tecnología.
Esta skill produce artículos de análisis de producto que posicionan en Google y convierten
visitas en clics de afiliado, respetando la arquitectura técnica del sitio.

## Entrada y entregables

**Entrada** (una de las dos):
- Un JSON de producto copiado del admin (campos: `asin`, `title`, `price`, `rating`, `reviews`, `features`, `description`, `details`, `images`, `url`).
- Un artículo existente para mejorar (HTML o texto), idealmente acompañado del JSON del producto.

Si falta el JSON y el artículo va vinculado a un producto, pide el ASIN como mínimo:
sin un enlace `https://www.amazon.es/dp/{ASIN}` el sistema bloquea la publicación.

**Entregables** (siempre los cinco, en este orden):
1. **HTML del artículo** en un bloque de código — solo el `<article>...</article>`, sin `<html>`/`<head>` (el admin lo envuelve).
2. **Título del artículo** (para el campo Título).
3. **Slug** sugerido (minúsculas, sin acentos, guiones).
4. **Meta description** (≤155 caracteres, con la keyword y un gancho).
5. **Keywords SEO** (6-8, separadas por comas: keyword principal, marca, categoría, variantes de búsqueda).

## Arquitectura del artículo (obligatoria)

El sitio genera automáticamente el índice de contenidos desde los `<h2>`, monetiza los
enlaces de Amazon y crea datos estructurados (FAQPage) desde la sección de preguntas.
Para que todo eso funcione, respeta esta estructura y estas clases:

```html
<article>
  <section class="verdict-box">
    <h2>Veredicto rápido</h2>
    <p>[Respuesta directa: qué es, para quién, rating y precio en negrita]</p>
    <ul class="takeaways">
      <li><strong>[Punto clave 1]</strong></li>
      <!-- 3-4 puntos clave escaneables -->
    </ul>
  </section>

  <section><h2>[Sección de introducción con la keyword]</h2> ... </section>
  <section><h2>Comparativa rápida</h2> [tabla con el producto y alternativas] </section>
  <section><h2>Especificaciones principales</h2> [tabla th/td con la ficha técnica] </section>
  <section><h2>Análisis de características</h2> [un <h3> por característica + párrafos] </section>
  <section><h2>Pros y contras</h2> [<h3>Pros</h3><ul>...</ul> <h3>A tener en cuenta</h3><ul>...</ul>] </section>
  <section><h2>Guía de compra</h2> [criterios con datos reales del producto] </section>
  <section><h2>Preguntas frecuentes</h2> [pares <h3>pregunta</h3><p>respuesta</p>] </section>
  <section><h2>Veredicto final</h2> [recomendación clara + enlace interno a categoría] </section>
</article>
```

Lee `references/reglas-sitio.md` antes de escribir el HTML: contiene las reglas técnicas
del sanitizador, los enlaces y las imágenes. Un HTML que las incumpla se degradará al
guardarse (el servidor elimina lo no permitido).

## Reglas de redacción SEO

- **Keyword principal**: la parte descriptiva del título del producto, limpia de ruido de
  Amazon (corta en el primer `|` y elimina coletillas). Debe aparecer en: H1/título, primer
  párrafo del veredicto, la intro, al menos una pregunta de la FAQ y la meta description.
  Densidad natural — si una frase suena robótica, reescríbela.
- **Título**: `{keyword}: opiniones y análisis ({año actual})`. Variantes aceptables si el
  usuario pide otro enfoque ("mejores X para Y"), pero siempre con año y palabra de intención
  ("opiniones", "análisis", "review", "comparativa").
- **Encabezados con intención de búsqueda**: las preguntas de la FAQ deben ser búsquedas
  reales ("¿Vale la pena...?", "¿Qué dimensiones tiene?", "¿Requiere montaje?"). Genera las
  FAQ desde los datos de `details` — nunca inventes datos que no estén en la entrada.
- **Formato escaneable**: párrafos de 2-4 líneas, listas frecuentes, negritas en datos clave
  (precio, medidas, materiales). Nada de muros de texto.
- **FAQ**: mínimo 5 preguntas con pares `<h3>` + `<p>` (el cliente construye el JSON-LD
  FAQPage desde ese patrón; otros formatos no generan rich results).

## Reglas de venta (E-E-A-T honesto)

Amazon y Google penalizan la reseña vacía. El texto debe sonar a analista que ha estudiado
el producto, no a vendedor:

- **Beneficio antes que característica**: no "espuma viscoelástica de alta densidad", sino
  "el asiento no se deforma con el uso diario gracias a la espuma de alta densidad".
- **Contras reales**: la sección "A tener en cuenta" debe contener limitaciones creíbles
  derivadas de los datos (envío en dos paquetes, tiempo de expansión, sin salida jack...).
  Un análisis sin pegas no genera confianza ni convierte.
- **Para quién sí / para quién no** en el veredicto final: la recomendación segmentada
  convierte mejor que el elogio universal y reduce devoluciones.
- **Responde objeciones en la FAQ**: montaje, limpieza, medidas, garantía — las dudas que
  frenan la compra.
- Prohibido: superlativos vacíos ("el mejor del mercado"), urgencia falsa ("¡últimas
  unidades!"), datos inventados (opiniones, premios, comparativas sin fuente).

## Al mejorar un artículo existente

1. Diagnostica primero contra esta guía: estructura, keyword, FAQ, contras, escaneabilidad.
2. Conserva lo que funciona (datos correctos, frases con voz propia) y reestructura lo demás.
3. Entrega el artículo completo reescrito (no un parche), más un resumen breve de qué
   cambiaste y por qué.

## Checklist final (verifica antes de entregar)

- [ ] `verdict-box` con `takeaways` al inicio; respuesta directa en las 2 primeras líneas.
- [ ] Todos los H2 de la arquitectura presentes; H3 solo bajo su H2.
- [ ] Ningún `<h1>` dentro del artículo (la página ya pinta el título).
- [ ] FAQ con ≥5 pares h3+p, con datos reales.
- [ ] Enlace de Amazon `https://www.amazon.es/dp/{ASIN}` presente al menos una vez.
- [ ] 1-2 imágenes de la galería (índices 1-2, nunca la 0) con `alt` descriptivo y `loading="lazy"`.
- [ ] Enlace interno `/categoria/{slug}` en el veredicto final si se conoce la categoría.
- [ ] Meta description ≤155 caracteres; título con año; slug sin acentos.
- [ ] Sin scripts, estilos inline, iframes ni atributos de evento (el sanitizador los elimina).
