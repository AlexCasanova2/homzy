# Homzy Affiliate (Node + Vue)

Proyecto único Node.js + Vue.js para un blog de afiliados de Amazon con panel admin, scraping suave y generación automática de artículos.

## Estructura
- `server/` Backend Express
- `client/` Frontend Vue + Vite
- `db/schema.sql` Esquema SQLite

## Requisitos
- Node.js 18+

## Instalación
```bash
npm install
npm --prefix server install
npm --prefix client install
```

## Desarrollo
```bash
npm run dev
```
- Frontend: `http://localhost:5173` (o 5174 si el puerto está ocupado)
- Backend: `http://localhost:5177`

## Flujo completo
1) **Scraping**: En el panel admin, importas un producto por URL -> `/api/products/import`.
2) **Generación**: Desde productos, pulsas “Generar artículo” -> `/api/generate-article` genera HTML y lo guarda como borrador.
3) **Previsualización**: El artículo generado aparece en la lista para revisar.
4) **Publicación**: Botón “Publicar” -> `/api/publish-article` cambia estado a publicado.
5) **Panel público**: El blog muestra sólo artículos publicados.

## Endpoints principales
- `GET /api/products` listar productos
- `POST /api/products/import` importar producto (scraping suave)
- `GET /api/articles` listar artículos
- `POST /api/articles` crear artículo manual
- `PUT /api/articles/:id` actualizar artículo
- `DELETE /api/articles/:id` borrar artículo
- `POST /api/generate-article` genera HTML y crea borrador
- `POST /api/publish-article` publica artículo
- `GET/POST /api/categories` categorías
- `GET/POST /api/tags` tags
- `GET/POST /api/affiliate-links` enlaces de afiliado

## Generación de artículos con LLM
El generador soporta un LLM compatible con OpenAI (OpenAI API, OpenRouter o un servidor local tipo Ollama).

Variables en `server/.env.example`:
```
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
LLM_API_KEY=
LLM_REFERRER=
LLM_APP_NAME=
```

- Si `LLM_PROVIDER=openai`, necesitas `LLM_API_KEY`.
- Si `LLM_PROVIDER=openrouter`, necesitas `LLM_API_KEY` y puedes añadir `LLM_REFERRER` y `LLM_APP_NAME`.
- Si `LLM_PROVIDER=ollama`, no es necesario API key.
- Si el LLM falla o no está configurado, el sistema usa el generador plantilla.

## Generación de artículos (plantilla)
El generador de fallback está en `server/src/services/articleGenerator.js`. Devuelve HTML SEO completo con:
- título SEO
- meta description
- introducción
- comparativa
- top productos
- pros/cons
- guía de compra
- FAQ
- CTA con enlace afiliado

## Notas
- El scraping es suave y básico (headers, delay). Está preparado para migrar a API oficial en el futuro.
- Los artículos manuales y automáticos viven en la misma base de datos.
- Las publicaciones programadas se guardan con `status=scheduled` y `scheduled_at`.

