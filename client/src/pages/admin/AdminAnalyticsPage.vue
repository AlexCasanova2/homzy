<template>
  <div class="analytics-page">
    <header class="page-header">
      <div>
        <h2>Analítica</h2>
        <p class="text-muted">Audiencia, origen del tráfico y rendimiento de los enlaces de afiliado.</p>
      </div>
      <div class="header-actions">
        <div class="range-picker">
          <button
            v-for="opt in RANGES"
            :key="opt"
            class="range-btn"
            :class="{ active: days === opt }"
            @click="load(opt)"
          >{{ opt }} días</button>
        </div>
        <button class="secondary small" @click="load(days)" :disabled="loading">
          <RefreshCwIcon :size="14" :class="{ spin: loading }" class="mr-8" />
          Actualizar
        </button>
      </div>
    </header>

    <p v-if="error" class="inline-error" role="alert">
      {{ error }} <button class="secondary small" @click="load(days)">Reintentar</button>
    </p>

    <div v-else-if="!metrics" class="inline-loading" aria-live="polite">
      <div class="spinner"></div><span>Cargando métricas...</span>
    </div>

    <template v-else>
      <!-- Totales del periodo -->
      <div class="metrics-totals">
        <div class="m-stat card">
          <span>Visitas</span>
          <strong>{{ formatNumber(metrics.totals.views) }}</strong>
        </div>
        <div class="m-stat card">
          <span>Clics de afiliado</span>
          <strong>{{ formatNumber(metrics.totals.clicks) }}</strong>
        </div>
        <div class="m-stat card">
          <span>CTR</span>
          <strong>{{ ctr(metrics.totals.clicks, metrics.totals.views) }}</strong>
        </div>
        <div class="m-stat card">
          <span>Media diaria de visitas</span>
          <strong>{{ dailyAverage }}</strong>
        </div>
      </div>

      <!-- Evolución diaria -->
      <section class="panel card">
        <div class="panel-header">
          <div class="header-with-icon">
            <BarChart3Icon :size="18" class="text-blue" />
            <h4>Evolución diaria</h4>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><i class="swatch swatch-views"></i> Visitas</span>
            <span class="legend-item"><i class="swatch swatch-clicks"></i> Clics</span>
          </div>
        </div>

        <div v-if="metrics.byDay.length" class="metrics-chart">
          <div
            v-for="d in metrics.byDay"
            :key="d.day"
            class="chart-col"
            :title="`${d.day}: ${d.views} visitas, ${d.clicks} clics`"
          >
            <div class="bar bar-views" :style="{ height: barHeight(d.views) }"></div>
            <div class="bar bar-clicks" :style="{ height: barHeight(d.clicks) }"></div>
          </div>
        </div>
        <p v-else class="text-muted metrics-empty">Sin actividad registrada en este periodo.</p>
      </section>

      <div class="panel-grid">
        <!-- Origen del tráfico -->
        <section class="panel card">
          <div class="panel-header">
            <div class="header-with-icon">
              <GlobeIcon :size="18" class="text-green" />
              <h4>Origen del tráfico</h4>
            </div>
          </div>
          <div v-if="metrics.byReferrer.length" class="table-responsive">
            <table class="table">
              <thead>
                <tr><th>Fuente</th><th class="text-right">Visitas</th><th class="text-right">%</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in referrers" :key="row.source">
                  <td class="truncate">
                    {{ row.label }}
                    <small v-if="row.internal" class="text-muted">· no es tráfico nuevo</small>
                  </td>
                  <td class="text-right">{{ formatNumber(row.views) }}</td>
                  <td class="text-right text-muted">{{ share(row.views, metrics.totals.views) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted metrics-empty">Sin datos de origen todavía.</p>
        </section>

        <!-- Clics por CTA -->
        <section class="panel card">
          <div class="panel-header">
            <div class="header-with-icon">
              <MousePointerClickIcon :size="18" class="text-orange" />
              <h4>Clics por CTA</h4>
            </div>
          </div>
          <div v-if="metrics.byContext.length" class="table-responsive">
            <table class="table">
              <thead>
                <tr><th>Contexto</th><th class="text-right">Clics</th><th class="text-right">%</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in metrics.byContext" :key="row.context">
                  <td class="truncate">{{ row.context }}</td>
                  <td class="text-right">{{ formatNumber(row.clicks) }}</td>
                  <td class="text-right text-muted">{{ share(row.clicks, metrics.totals.clicks) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted metrics-empty">Sin clics de afiliado registrados en este periodo.</p>
        </section>
      </div>

      <!-- Rendimiento por artículo -->
      <section class="panel card">
        <div class="panel-header">
          <div class="header-with-icon">
            <FileTextIcon :size="18" class="text-blue" />
            <h4>Rendimiento por artículo</h4>
          </div>
          <span class="text-muted text-xs">Ordenado por visitas</span>
        </div>

        <div v-if="articles.length" class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th class="text-right">Visitas</th>
                <th class="text-right">Clics</th>
                <th class="text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedArticles" :key="row.article_id">
                <td class="truncate">
                  <a v-if="row.slug" :href="`/analisis/${row.slug}`" target="_blank" rel="noopener">{{ row.title }}</a>
                  <span v-else class="text-muted">(artículo eliminado)</span>
                </td>
                <td class="text-right">{{ formatNumber(row.views) }}</td>
                <td class="text-right">{{ formatNumber(row.clicks) }}</td>
                <td class="text-right">{{ ctr(row.clicks, row.views) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted metrics-empty">Aún no hay actividad registrada en artículos.</p>

        <TablePagination
          v-model:page="articlePage"
          v-model:pageSize="articlePageSize"
          :total="articleTotal"
          :total-pages="articleTotalPages"
          label="artículos"
        />
      </section>

      <!-- Páginas más vistas -->
      <section class="panel card">
        <div class="panel-header">
          <div class="header-with-icon">
            <LinkIcon :size="18" class="text-purple" />
            <h4>Páginas más vistas</h4>
          </div>
          <span class="text-muted text-xs">Incluye portada, categorías y búsquedas</span>
        </div>

        <div v-if="paths.length" class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th class="text-right">Visitas</th>
                <th class="text-right">Clics</th>
                <th class="text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedPaths" :key="row.path">
                <td class="truncate"><a :href="row.path" target="_blank" rel="noopener"><code>{{ row.path }}</code></a></td>
                <td class="text-right">{{ formatNumber(row.views) }}</td>
                <td class="text-right">{{ formatNumber(row.clicks) }}</td>
                <td class="text-right">{{ ctr(row.clicks, row.views) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted metrics-empty">Sin visitas registradas en este periodo.</p>

        <TablePagination
          v-model:page="pathPage"
          v-model:pageSize="pathPageSize"
          :total="pathTotal"
          :total-pages="pathTotalPages"
          label="rutas"
        />
      </section>

      <p class="privacy-note">
        Métricas propias y anónimas: no se registra IP, user-agent ni cookies. Solo qué se vio y qué se clicó.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../api.js";
import TablePagination from "../../components/TablePagination.vue";
import { usePagination } from "../../composables/usePagination.js";
import {
  BarChart3Icon,
  FileTextIcon,
  GlobeIcon,
  LinkIcon,
  MousePointerClickIcon,
  RefreshCwIcon,
} from "lucide-vue-next";

const RANGES = [7, 30, 90, 365];

const metrics = ref(null);
const days = ref(30);
const loading = ref(false);
const error = ref("");

const articles = computed(() => metrics.value?.byArticle ?? []);
const paths = computed(() => metrics.value?.byPath ?? []);

// El referrer de una navegación dentro del propio sitio no es una fuente de tráfico:
// se marca para no confundirlo con visitas nuevas.
const referrers = computed(() =>
  (metrics.value?.byReferrer ?? []).map((row) => {
    const internal = row.source === window.location.host;
    return { ...row, internal, label: internal ? "Navegación interna" : row.source };
  })
);

const {
  page: articlePage,
  pageSize: articlePageSize,
  total: articleTotal,
  totalPages: articleTotalPages,
  paginated: pagedArticles,
} = usePagination(articles, { storageKey: "homzy.admin.analytics.articles.pageSize" });

const {
  page: pathPage,
  pageSize: pathPageSize,
  total: pathTotal,
  totalPages: pathTotalPages,
  paginated: pagedPaths,
} = usePagination(paths, { storageKey: "homzy.admin.analytics.paths.pageSize" });

const dailyAverage = computed(() => {
  const byDay = metrics.value?.byDay ?? [];
  if (!byDay.length) return "0";
  // Media sobre los días con actividad, no sobre el rango: evita diluir el dato en sitios nuevos.
  return formatNumber(Math.round(metrics.value.totals.views / byDay.length));
});

async function load(range = 30) {
  days.value = range;
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get(`/metrics/summary?days=${range}`);
    metrics.value = data;
  } catch (err) {
    error.value = err?.response?.data?.error || "No se pudieron cargar las métricas.";
  } finally {
    loading.value = false;
  }
}

function ctr(clicks, views) {
  if (!views) return "—";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

function share(value, total) {
  if (!total) return "—";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

function barHeight(value) {
  const max = Math.max(1, ...(metrics.value?.byDay || []).map((d) => Math.max(d.views, d.clicks)));
  return `${Math.max(3, Math.round((value / max) * 100))}%`;
}

onMounted(() => load(30));
</script>

<style scoped>
.mr-8 { margin-right: 8px; }
.text-right { text-align: right; }
.text-xs { font-size: 12px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.page-header h2 {
  font-family: 'Montserrat', sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-picker {
  display: flex;
  gap: 6px;
}

.range-btn {
  padding: 5px 12px !important;
  font-size: 12px !important;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
}

.range-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.metrics-totals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.m-stat {
  padding: 20px;
}

.m-stat span {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.m-stat strong {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
}

.panel {
  margin-bottom: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.header-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-with-icon h4 {
  font-weight: 700;
  margin: 0;
}

.text-blue { color: #3b82f6; }
.text-purple { color: #a855f7; }
.text-orange { color: #f59e0b; }
.text-green { color: #22c55e; }

.chart-legend {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.swatch-views { background: rgba(176, 85, 47, 0.35); }
.swatch-clicks { background: var(--primary); }

.metrics-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 140px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--background);
}

.chart-col {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 100%;
}

.bar {
  width: 45%;
  max-width: 14px;
  border-radius: 3px 3px 0 0;
}

.bar-views { background: rgba(176, 85, 47, 0.35); }
.bar-clicks { background: var(--primary); }

.panel-grid {
  display: grid;
  /* minmax(0, 1fr): con 1fr a secas el mínimo implícito es el contenido, y una celda
     nowrap de la tabla impedía a la columna encoger, desbordando la página en móvil. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.truncate {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table a:hover { color: var(--primary); }

.metrics-empty {
  padding: 16px 0;
  font-size: 14px;
}

.privacy-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .metrics-totals { grid-template-columns: repeat(2, 1fr); }
  .panel-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 640px) {
  .metrics-totals { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }

  /* Layout fijo: la primera columna absorbe el espacio y recorta con elipsis
     (en layout automático max-width sobre un td se ignora y la tabla desbordaba).
     Así las cuatro tablas caben sin scroll horizontal. */
  .panel .table {
    table-layout: fixed;
  }

  .panel .table th:first-child {
    width: 45%;
  }

  .panel .table th,
  .panel .table td {
    padding: 10px 8px;
  }

  .truncate {
    max-width: none;
  }
}
</style>
