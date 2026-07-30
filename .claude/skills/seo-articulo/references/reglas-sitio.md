# Reglas técnicas del sitio Homzy

El HTML pegado en el admin pasa por un sanitizador en el servidor (`sanitizeArticleHtml`).
Lo que incumpla estas reglas no rompe nada, pero se elimina silenciosamente — así que
escribir fuera de estas reglas es desperdiciar trabajo.

## Etiquetas y atributos permitidos

- **Permitido**: `article, section, header, footer, aside, h1-h6, p, br, hr, strong, b, em,
  i, u, small, blockquote, ul, ol, li, dl, dt, dd, figure, figcaption, picture, source, img,
  table, caption, thead, tbody, tfoot, tr, th, td, a, span, div, code, pre`.
- **Atributos**: `class` en cualquier etiqueta; `href, title, target, rel` en `a`;
  `src, alt, title, width, height, loading` en `img`; `colspan, rowspan, scope` en celdas.
- **Se elimina**: `<script>`, `<style>`, `<iframe>`, estilos inline (`style=`), atributos de
  evento (`onclick`...), formularios. No los uses.
- Clases con CSS ya definido en el sitio: `verdict-box`, `takeaways`, `affiliate-cta`,
  `btn-buy`. No inventes clases nuevas (no tendrán estilos).

## Enlaces

- **Amazon**: usa siempre `https://www.amazon.es/dp/{ASIN}` (limpio, sin parámetros).
  El servidor añade automáticamente el tag de afiliado y `rel="nofollow sponsored noopener"`
  a todo enlace de Amazon — no hace falta (ni conviene) añadir tags a mano.
- **NUNCA** enlaces acortados (`amzn.to`, `link.amazon`...): el sistema los rechaza.
- **Internos**: rutas relativas (`/categoria/sofas`, `/analisis/otro-slug`). Buenos para SEO.
- **Externos no-Amazon**: solo si aportan autoridad real (fabricante, normativa). Pocos.
- El artículo vinculado a un producto NO puede publicarse sin al menos un enlace
  `/dp/{ASIN}` de ese producto en el HTML.

## Imágenes

- Usa las URLs del array `images` del JSON del producto (dominio `m.media-amazon.com`).
- **No uses `images[0]`**: esa es la imagen destacada que la página ya muestra en la
  cabecera; repetirla queda mal. Usa `images[1]`, `images[2]`...
- Formato: `<figure><img src="..." alt="[keyword] - [qué se ve]" loading="lazy" width="720" height="480" /></figure>`
- El `alt` siempre descriptivo y con la keyword de forma natural.

## Qué genera el sitio automáticamente (no lo dupliques)

- **Índice de contenidos**: se construye desde los `<h2>` — por eso los H2 deben ser
  titulares claros y no muy largos.
- **CTA de compra**: en artículos generados desde el panel se añade sola al final
  (`affiliate-cta` con botón). En artículos manuales, añade tú una al final del veredicto:
  `<section class="affiliate-cta"><h2>Consulta precio y disponibilidad</h2><p><a class="btn-buy" href="https://www.amazon.es/dp/{ASIN}" target="_blank" rel="nofollow sponsored noopener">VER PRECIO EN AMAZON</a></p></section>`
- **JSON-LD** (Product + FAQPage): se genera desde los datos del producto y desde los pares
  `<h3>`+`<p>` de la sección cuyo `<h2>` contiene "Preguntas frecuentes" o "FAQ".
- **Monetización**: todo enlace de Amazon sale con el tag de afiliado del sitio.
- **Título y meta**: la página pinta el título del artículo como H1 y la meta description
  bajo él — por eso el HTML no debe llevar `<h1>` ni repetir la meta al principio.

## Datos del JSON del producto

- `features`: bullets de Amazon con formato "Etiqueta: explicación". Sepáralos por los dos
  puntos para crear los `<h3>` del análisis de características.
- `details`: ficha técnica clave→valor. Es la fuente para la tabla de especificaciones,
  la guía de compra y las FAQ con datos. Ignora entradas redundantes o mal formateadas
  (p. ej. "1f. x 2an. x 0,7al. metros" — usa la variante en centímetros si existe).
- `rating`/`reviews`: cítalos ("4,4/5 entre 67 opiniones") — es prueba social real.
- `price`: oriéntalo siempre como "precio orientativo" (varía con las ofertas).
