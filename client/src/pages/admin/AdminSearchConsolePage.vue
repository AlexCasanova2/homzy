<template>
  <div class="gsc-page">
    <header class="page-header">
      <div>
        <h2>Search Console</h2>
        <p class="text-muted">Rendimiento en Google y estado de indexación de cada artículo.</p>
      </div>
      <div class="header-actions">
        <div class="range-picker">
          <button
            v-for="opt in RANGES"
            :key="opt"
            class="range-btn"
            :class="{ active: days === opt }"
            @click="loadSummary(opt)"
          >{{ opt }} días</button>
        </div>
        <button class="secondary small" @click="loadAll()" :disabled="loading">
          <RefreshCwIcon :size="14" :class="{ spin: loading }" class="mr-8" />
          Actualizar
        </button>
      </div>
    </header>

    <!-- Sin configurar: instrucciones de puesta en marcha -->
    <section v-if="status && !status.configured" class="panel card setup-card">
      <div class="header-with-icon">
        <SettingsIcon :size="18" class="text-orange" />
        <h4>Falta configurar la conexión</h4>
      </div>
      <p class="text-muted">
        Añade estas variables de entorno en Vercel y vuelve a desplegar. Faltan:
        <code v-for="m in status.missing" :key="m" class="missing-var">{{ m }}</code>
      </p>
      <ol class="setup-steps">
        <li>En Google Cloud, crea un proyecto y activa <strong>Google Search Console API</strong> y <strong>Search Console API</strong>.</li>
        <li>Crea una <strong>cuenta de servicio</strong> y genera una clave JSON.</li>
        <li>Copia <code>client_email</code> a <code>GSC_CLIENT_EMAIL</code> y <code>private_key</code> a <code>GSC_PRIVATE_KEY</code>.</li>
        <li>En Search Console → Configuración → Usuarios y permisos, añade ese correo como usuario <strong>Propietario</strong> (hace falta para la Inspección de URL).</li>
        <li>Pon en <code>GSC_SITE_URL</code> la propiedad exacta: <code>sc-domain:homzy.es</code> si es propiedad de dominio, o <code>https://homzy.es/</code> si es de prefijo de URL.</li>
      </ol>
    </section>

    <!-- Configurado pero sin acceso a la propiedad -->
    <p v-else-if="status && status.configured && !status.hasAccess" class="inline-error" role="alert">
      La cuenta de servicio no tiene acceso a <code>{{ status.siteUrl }}</code>.
      <template v-if="status.availableSites?.length">
        Propiedades disponibles: <code v-for="s in status.availableSites" :key="s">{{ s }}</code>.
      </template>
      <template v-else>
        Añádela como usuario en Search Console → Configuración → Usuarios y permisos.
      </template>
      <span v-if="status.error" class="block text-muted">{{ status.error }}</span>
    </p>

    <template v-if="status?.configured && status?.hasAccess">
      <p v-if="error" class="inline-error" role="alert">
        {{ error }} <button class="secondary small" @click="loadAll()">Reintentar</button>
      </p>

      <div v-if="!summary && loading" class="inline-loading" aria-live="polite">
        <div class="spinner"></div><span>Cargando datos de Search Console...</span>
      </div>

      <template v-if="summary">
        <!-- Totales -->
        <div class="metrics-totals">
          <div class="m-stat card">
            <span>Clics</span>
            <strong>{{ formatNumber(summary.totals.clicks) }}</strong>
          </div>
          <div class="m-stat card">
            <span>Impresiones</span>
            <strong>{{ formatNumber(summary.totals.impressions) }}</strong>
          </div>
          <div class="m-stat card">
            <span>CTR medio</span>
            <strong>{{ pct(summary.totals.ctr) }}</strong>
          </div>
          <div class="m-stat card">
            <span>Posición media</span>
            <strong>{{ summary.totals.position ? summary.totals.position.toFixed(1) : '—' }}</strong>
          </div>
        </div>

        <p class="text-muted text-xs range-note">
          Datos del {{ summary.range.startDate }} al {{ summary.range.endDate }}.
          Search Console publica con 2-3 días de retraso, por eso no llega hasta hoy.
        </p>

        <!-- Evolución -->
        <section class="panel card">
          <div class="panel-header">
            <div class="header-with-icon">
              <BarChart3Icon :size="18" class="text-blue" />
              <h4>Evolución diaria</h4>
            </div>
            <div class="chart-legend">
              <button
                class="legend-item"
                :class="{ muted: !showImpressions }"
                :aria-pressed="showImpressions"
                @click="showImpressions = !showImpressions"
              ><i class="swatch swatch-impressions"></i> Impresiones <small>eje izq.</small></button>
              <button
                class="legend-item"
                :class="{ muted: !showClicks }"
                :aria-pressed="showClicks"
                @click="showClicks = !showClicks"
              ><i class="swatch swatch-clicks"></i> Clics <small>eje der.</small></button>
            </div>
          </div>
          <div
            v-if="chart.points.length"
            class="metrics-chart"
            @pointerleave="activeChartIndex = null"
          >
            <svg
              class="chart-svg"
              :viewBox="`0 0 ${chart.width} ${chart.height}`"
              role="img"
              aria-labelledby="gsc-chart-title gsc-chart-description"
            >
              <title id="gsc-chart-title">Evolución diaria del rendimiento en Google</title>
              <desc id="gsc-chart-description">Impresiones en el eje izquierdo y clics en el eje derecho.</desc>

              <g class="chart-grid">
                <g v-for="line in chart.grid" :key="line.y">
                  <line :x1="chart.left" :x2="chart.right" :y1="line.y" :y2="line.y" />
                  <text class="axis-label axis-left" :x="chart.left - 12" :y="line.y + 4">{{ line.impressions }}</text>
                  <text class="axis-label axis-right" :x="chart.right + 12" :y="line.y + 4">{{ line.clicks }}</text>
                </g>
              </g>

              <g class="chart-dates">
                <text
                  v-for="tick in chart.dateTicks"
                  :key="tick.date"
                  class="axis-label"
                  :x="tick.x"
                  :y="chart.height - 10"
                  :text-anchor="tick.anchor"
                >{{ tick.label }}</text>
              </g>

              <path v-if="showImpressions" class="impressions-area" :d="chart.impressionsArea" />
              <path v-if="showImpressions" class="chart-line impressions-line" :d="chart.impressionsPath" />
              <path v-if="showClicks" class="chart-line clicks-line" :d="chart.clicksPath" />

              <g v-if="activeChartPoint" class="chart-active" aria-hidden="true">
                <line
                  :x1="activeChartPoint.x"
                  :x2="activeChartPoint.x"
                  :y1="chart.top"
                  :y2="chart.bottom"
                />
                <circle
                  v-if="showImpressions"
                  class="point-impressions"
                  :cx="activeChartPoint.x"
                  :cy="activeChartPoint.yImpressions"
                  r="6"
                />
                <circle
                  v-if="showClicks"
                  class="point-clicks"
                  :cx="activeChartPoint.x"
                  :cy="activeChartPoint.yClicks"
                  r="6"
                />
              </g>

              <rect
                v-for="(point, index) in chart.points"
                :key="point.date"
                class="chart-hit-area"
                :x="point.hitX"
                :y="chart.top"
                :width="point.hitWidth"
                :height="chart.bottom - chart.top"
                tabindex="0"
                :aria-label="chartPointLabel(point)"
                @pointerenter="activeChartIndex = index"
                @pointerdown="activeChartIndex = index"
                @focus="activeChartIndex = index"
                @blur="activeChartIndex = null"
              />
            </svg>

            <div
              v-if="activeChartPoint"
              class="chart-tooltip"
              :style="{ left: chartTooltipLeft }"
              aria-hidden="true"
            >
              <strong>{{ formatChartDate(activeChartPoint.date, true) }}</strong>
              <span><i class="swatch swatch-impressions"></i>{{ formatNumber(activeChartPoint.impressions) }} impresiones</span>
              <span><i class="swatch swatch-clicks"></i>{{ formatNumber(activeChartPoint.clicks) }} clics</span>
              <small>CTR {{ pct(activeChartPoint.ctr) }} · Posición {{ formatPosition(activeChartPoint.position) }}</small>
            </div>
          </div>
          <p v-else class="text-muted metrics-empty">Sin datos en este periodo.</p>
        </section>

        <div class="panel-grid">
          <!-- Consultas -->
          <section class="panel card">
            <div class="panel-header">
              <div class="header-with-icon">
                <SearchIcon :size="18" class="text-green" />
                <h4>Consultas principales</h4>
              </div>
              <span class="text-muted text-xs">Lo que la gente busca</span>
            </div>
            <div v-if="summary.byQuery.length" class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Consulta</th>
                    <th class="text-right">Clics</th>
                    <th class="text-right">Impr.</th>
                    <th class="text-right">CTR</th>
                    <th class="text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pagedQueries" :key="row.query">
                    <td class="truncate">{{ row.query }}</td>
                    <td class="text-right">{{ formatNumber(row.clicks) }}</td>
                    <td class="text-right">{{ formatNumber(row.impressions) }}</td>
                    <td class="text-right text-muted">{{ pct(row.ctr) }}</td>
                    <td class="text-right text-muted">{{ row.position.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-muted metrics-empty">Sin consultas registradas todavía.</p>
            <TablePagination
              v-model:page="queryPage"
              v-model:pageSize="queryPageSize"
              :total="queryTotal"
              :total-pages="queryTotalPages"
              label="consultas"
            />
          </section>

          <!-- Páginas -->
          <section class="panel card">
            <div class="panel-header">
              <div class="header-with-icon">
                <LinkIcon :size="18" class="text-purple" />
                <h4>Páginas con más impresiones</h4>
              </div>
            </div>
            <div v-if="summary.byPage.length" class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Página</th>
                    <th class="text-right">Clics</th>
                    <th class="text-right">Impr.</th>
                    <th class="text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in pagedPages" :key="row.page">
                    <td class="truncate">
                      <a :href="row.page" target="_blank" rel="noopener"><code>{{ shortPath(row.page) }}</code></a>
                    </td>
                    <td class="text-right">{{ formatNumber(row.clicks) }}</td>
                    <td class="text-right">{{ formatNumber(row.impressions) }}</td>
                    <td class="text-right text-muted">{{ row.position.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-muted metrics-empty">Sin páginas con impresiones todavía.</p>
            <TablePagination
              v-model:page="pagePage"
              v-model:pageSize="pagePageSize"
              :total="pageTotal"
              :total-pages="pageTotalPages"
              label="páginas"
            />
          </section>
        </div>
      </template>

      <!-- Sitemaps -->
      <section class="panel card">
        <div class="panel-header">
          <div class="header-with-icon">
            <FileCodeIcon :size="18" class="text-blue" />
            <h4>Sitemaps</h4>
          </div>
          <button class="secondary small" @click="resubmitSitemap" :disabled="submitting">
            {{ submitting ? 'Enviando...' : 'Reenviar sitemap' }}
          </button>
        </div>
        <div v-if="sitemaps.length" class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th class="text-right">Enviadas</th>
                <th class="text-right">Indexadas</th>
                <th class="text-right">Errores</th>
                <th>Última lectura</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sitemaps" :key="s.path">
                <td class="truncate"><code>{{ shortPath(s.path) }}</code></td>
                <td class="text-right">{{ formatNumber(s.submitted) }}</td>
                <td class="text-right">{{ s.indexed ? formatNumber(s.indexed) : '—' }}</td>
                <td class="text-right" :class="{ 'text-danger': s.errors > 0 }">{{ s.errors }}</td>
                <td class="text-muted">{{ formatDate(s.lastDownloaded) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted metrics-empty">
          Ningún sitemap enviado. Pulsa «Reenviar sitemap» para dar de alta <code>/sitemap.xml</code>.
        </p>
      </section>

      <!-- Estado de indexación -->
      <section class="panel card">
        <div class="panel-header">
          <div class="header-with-icon">
            <ListChecksIcon :size="18" class="text-orange" />
            <h4>Estado de indexación</h4>
          </div>
          <div class="header-actions">
            <label class="coverage-search">
              <SearchIcon :size="14" aria-hidden="true" />
              <input
                v-model="coverageSearch"
                type="search"
                placeholder="Buscar artículo..."
                aria-label="Buscar artículo por título o URL"
                @input="coveragePage = 1"
              />
            </label>
            <select v-model="coverageFilter" class="filter-select">
              <option value="all">Todos ({{ coverage.length }})</option>
              <option value="unchecked">Sin comprobar ({{ counts.unchecked }})</option>
              <option value="notIndexed">No indexados ({{ counts.notIndexed }})</option>
              <option value="indexed">Indexados ({{ counts.indexed }})</option>
            </select>
            <button class="secondary small" @click="inspectPending" :disabled="inspecting">
              <RefreshCwIcon :size="14" :class="{ spin: inspecting }" class="mr-8" />
              {{ inspecting ? 'Comprobando...' : 'Comprobar pendientes' }}
            </button>
          </div>
        </div>

        <p class="text-muted text-xs help-note">
          Google no permite pedir indexación por API para artículos (su Indexing API solo cubre
          ofertas de empleo y retransmisiones). El botón «Solicitar» comprueba la URL y abre su
          resultado exacto en Search Console: allí se pide la indexación con un clic.
        </p>

        <p v-if="inspectMessage" class="inline-note">{{ inspectMessage }}</p>

        <div v-if="filteredCoverage.length" class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Estado</th>
                <th>Último rastreo</th>
                <th>Comprobado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedCoverage" :key="row.id">
                <td class="truncate">
                  <a :href="row.url" target="_blank" rel="noopener">{{ row.title }}</a>
                </td>
                <td>
                  <span class="badge" :class="badgeClass(row)">{{ stateLabel(row) }}</span>
                  <small v-if="row.coverageState && row.verdict !== 'PASS'" class="block text-muted">
                    {{ row.coverageState }}
                  </small>
                </td>
                <td class="text-muted">{{ formatDate(row.lastCrawlTime) }}</td>
                <td class="text-muted">{{ formatDate(row.checkedAt) }}</td>
                <td class="text-right nowrap">
                  <button class="secondary small" @click="inspectOne(row)" :disabled="inspecting">
                    Comprobar
                  </button>
                  <button class="secondary small" @click="requestIndexing(row)" :disabled="inspecting">
                    {{ requestingArticleId === row.id ? 'Abriendo...' : 'Solicitar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted metrics-empty">
          {{ coverageSearch ? 'No hay artículos que coincidan con la búsqueda.' : 'No hay artículos con ese filtro.' }}
        </p>

        <TablePagination
          v-model:page="coveragePage"
          v-model:pageSize="coveragePageSize"
          :total="coverageTotal"
          :total-pages="coverageTotalPages"
          label="artículos"
        />
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../api.js";
import TablePagination from "../../components/TablePagination.vue";
import { usePagination } from "../../composables/usePagination.js";
import { useToastStore } from "../../stores/toast.js";
import {
  BarChart3Icon,
  FileCodeIcon,
  LinkIcon,
  ListChecksIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-vue-next";

const RANGES = [7, 28, 90, 180];

const toast = useToastStore();
const status = ref(null);
const summary = ref(null);
const coverage = ref([]);
const sitemaps = ref([]);
const days = ref(28);
const loading = ref(false);
const inspecting = ref(false);
const submitting = ref(false);
const error = ref("");
const inspectMessage = ref("");
const coverageFilter = ref("all");
const coverageSearch = ref("");
const requestingArticleId = ref(null);
const showImpressions = ref(true);
const showClicks = ref(true);
const activeChartIndex = ref(null);

const queries = computed(() => summary.value?.byQuery ?? []);
const pages = computed(() => summary.value?.byPage ?? []);

const chart = computed(() => buildChart(summary.value?.byDay ?? []));
const activeChartPoint = computed(() => (
  activeChartIndex.value === null ? null : chart.value.points[activeChartIndex.value] ?? null
));
const chartTooltipLeft = computed(() => {
  if (!activeChartPoint.value) return "50%";
  return `clamp(92px, ${(activeChartPoint.value.x / chart.value.width) * 100}%, calc(100% - 92px))`;
});

// Un artículo está "indexado" si el veredicto de Google es PASS. El resto se
// reparte entre nunca comprobados y comprobados sin indexar.
const counts = computed(() => ({
  unchecked: coverage.value.filter((r) => !r.checkedAt).length,
  indexed: coverage.value.filter((r) => r.verdict === "PASS").length,
  notIndexed: coverage.value.filter((r) => r.checkedAt && r.verdict !== "PASS").length,
}));

const filteredCoverage = computed(() => {
  let rows = coverage.value;
  if (coverageFilter.value === "unchecked") rows = rows.filter((r) => !r.checkedAt);
  if (coverageFilter.value === "indexed") rows = rows.filter((r) => r.verdict === "PASS");
  if (coverageFilter.value === "notIndexed") rows = rows.filter((r) => r.checkedAt && r.verdict !== "PASS");
  const search = normalizeSearch(coverageSearch.value);
  if (!search) return rows;
  return rows.filter((row) => normalizeSearch(`${row.title} ${row.slug} ${row.url}`).includes(search));
});

const {
  page: queryPage, pageSize: queryPageSize, total: queryTotal,
  totalPages: queryTotalPages, paginated: pagedQueries,
} = usePagination(queries, { storageKey: "homzy.admin.gsc.queries.pageSize" });

const {
  page: pagePage, pageSize: pagePageSize, total: pageTotal,
  totalPages: pageTotalPages, paginated: pagedPages,
} = usePagination(pages, { storageKey: "homzy.admin.gsc.pages.pageSize" });

const {
  page: coveragePage, pageSize: coveragePageSize, total: coverageTotal,
  totalPages: coverageTotalPages, paginated: pagedCoverage,
} = usePagination(filteredCoverage, { storageKey: "homzy.admin.gsc.coverage.pageSize" });

async function loadStatus() {
  const { data } = await api.get("/search-console/status");
  status.value = data;
  return data;
}

async function loadSummary(range = days.value) {
  days.value = range;
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get(`/search-console/summary?days=${range}`);
    summary.value = data;
  } catch (err) {
    error.value = err?.response?.data?.error || "No se pudieron cargar los datos de rendimiento.";
  } finally {
    loading.value = false;
  }
}

async function loadCoverage() {
  const { data } = await api.get("/search-console/coverage");
  coverage.value = data.articles;
}

async function loadSitemaps() {
  try {
    const { data } = await api.get("/search-console/sitemaps");
    sitemaps.value = data.sitemaps;
  } catch {
    sitemaps.value = [];
  }
}

async function loadAll() {
  loading.value = true;
  try {
    const s = await loadStatus();
    if (!s.configured || !s.hasAccess) return;
    await Promise.all([loadSummary(days.value), loadCoverage(), loadSitemaps()]);
  } catch (err) {
    error.value = err?.response?.data?.error || "No se pudo conectar con Search Console.";
  } finally {
    loading.value = false;
  }
}

async function inspectPending() {
  inspecting.value = true;
  inspectMessage.value = "";
  try {
    const { data } = await api.post("/search-console/inspect", { limit: 10 });
    const fallidos = data.results.filter((r) => !r.ok);
    inspectMessage.value = data.inspected
      ? `Comprobadas ${data.inspected} URL${data.inspected === 1 ? "" : "s"}.` +
        (fallidos.length ? ` ${fallidos.length} con error: ${fallidos[0].error}` : "")
      : "No quedaban artículos pendientes de comprobar.";
    await loadCoverage();
  } catch (err) {
    inspectMessage.value = err?.response?.data?.error || "No se pudo comprobar el estado.";
  } finally {
    inspecting.value = false;
  }
}

async function inspectOne(row) {
  inspecting.value = true;
  try {
    const { data } = await api.post("/search-console/inspect", { articleIds: [row.id] });
    const result = data.results[0];
    if (result?.ok) toast.success(`${row.title}: ${stateLabel(result)}`);
    else toast.error(result?.error || "No se pudo comprobar");
    await loadCoverage();
  } catch (err) {
    toast.error(err?.response?.data?.error || "No se pudo comprobar");
  } finally {
    inspecting.value = false;
  }
}

async function requestIndexing(row) {
  const searchConsoleTab = window.open("", "_blank");
  if (!searchConsoleTab) {
    toast.error("El navegador ha bloqueado la nueva pestaña. Permite ventanas emergentes para Homzy.");
    return;
  }
  searchConsoleTab.opener = null;
  searchConsoleTab.document.title = "Abriendo Search Console...";
  searchConsoleTab.document.body.textContent = "Comprobando la URL y abriendo Search Console...";
  requestingArticleId.value = row.id;
  inspecting.value = true;
  try {
    const { data } = await api.post("/search-console/inspect", { articleIds: [row.id] });
    const result = data.results[0];
    if (!result?.ok || !result.inspectionLink) {
      searchConsoleTab.close();
      toast.error(result?.error || "Google no devolvió el enlace de inspección para esta URL.");
      return;
    }
    searchConsoleTab.location.replace(result.inspectionLink);
    await loadCoverage();
  } catch (err) {
    searchConsoleTab.close();
    toast.error(err?.response?.data?.error || "No se pudo abrir la inspección de esta URL.");
  } finally {
    requestingArticleId.value = null;
    inspecting.value = false;
  }
}

async function resubmitSitemap() {
  submitting.value = true;
  try {
    await api.post("/search-console/sitemaps/submit", {});
    toast.success("Sitemap reenviado a Google");
    await loadSitemaps();
  } catch (err) {
    toast.error(err?.response?.data?.error || "No se pudo reenviar el sitemap");
  } finally {
    submitting.value = false;
  }
}

function stateLabel(row) {
  if (!row.checkedAt && !row.verdict) return "Sin comprobar";
  if (row.verdict === "PASS") return "Indexado";
  if (row.verdict === "NEUTRAL") return "Conocido, sin indexar";
  if (row.verdict === "FAIL") return "Con error";
  return row.coverageState || "Desconocido";
}

function badgeClass(row) {
  if (!row.checkedAt && !row.verdict) return "badge-muted";
  if (row.verdict === "PASS") return "badge-success";
  if (row.verdict === "FAIL") return "badge-danger";
  return "badge-warning";
}

function pct(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function shortPath(url) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

function buildChart(rows) {
  const width = 1000;
  const height = 280;
  const left = 48;
  const right = 952;
  const top = 18;
  const bottom = 240;
  const impressionsMax = niceMax(Math.max(0, ...rows.map((row) => Number(row.impressions) || 0)));
  const clicksMax = niceMax(Math.max(0, ...rows.map((row) => Number(row.clicks) || 0)));
  const timestamps = rows.map((row) => Date.parse(`${row.date}T12:00:00`));
  const firstTimestamp = timestamps[0] || 0;
  const timeSpan = (timestamps.at(-1) || firstTimestamp) - firstTimestamp;
  const y = (value, max) => bottom - ((Number(value) || 0) / max) * (bottom - top);
  const points = rows.map((row, index) => ({
    ...row,
    x: timeSpan > 0 ? left + ((timestamps[index] - firstTimestamp) / timeSpan) * (right - left) : (left + right) / 2,
    yImpressions: y(row.impressions, impressionsMax),
    yClicks: y(row.clicks, clicksMax),
  }));
  for (const [index, point] of points.entries()) {
    const previousX = points[index - 1]?.x ?? left;
    const nextX = points[index + 1]?.x ?? right;
    point.hitX = index === 0 ? left : (previousX + point.x) / 2;
    point.hitWidth = index === points.length - 1 ? right - point.hitX : (point.x + nextX) / 2 - point.hitX;
  }
  const pathFor = (key) => points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point[key]}`).join(" ");
  const impressionsPath = pathFor("yImpressions");
  const grid = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      y: top + ratio * (bottom - top),
      impressions: Math.round(impressionsMax * (1 - ratio)),
      clicks: formatAxisNumber(clicksMax * (1 - ratio)),
    };
  });
  const tickIndexes = [...new Set(Array.from({ length: Math.min(6, rows.length) }, (_, index) => (
    Math.round(index * (rows.length - 1) / Math.max(1, Math.min(6, rows.length) - 1))
  )))];
  const dateTicks = tickIndexes.map((index, tickIndex) => ({
    date: points[index].date,
    x: points[index].x,
    label: formatChartDate(points[index].date),
    anchor: tickIndex === 0 ? "start" : tickIndex === tickIndexes.length - 1 ? "end" : "middle",
  }));
  return {
    width, height, left, right, top, bottom, points, grid, dateTicks,
    impressionsPath,
    clicksPath: pathFor("yClicks"),
    impressionsArea: points.length ? `${impressionsPath} L ${points.at(-1).x} ${bottom} L ${points[0].x} ${bottom} Z` : "",
  };
}

function niceMax(value) {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatAxisNumber(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatChartDate(value, long = false) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-ES", long
    ? { weekday: "short", day: "numeric", month: "short" }
    : { day: "numeric", month: "short" });
}

function formatPosition(value) {
  return Number(value) ? Number(value).toFixed(1) : "—";
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function chartPointLabel(point) {
  return `${formatChartDate(point.date, true)}: ${point.impressions} impresiones, ${point.clicks} clics, CTR ${pct(point.ctr)}, posición ${formatPosition(point.position)}`;
}

onMounted(loadAll);
</script>

<style scoped>
.mr-8 { margin-right: 8px; }
.text-right { text-align: right; }
.text-xs { font-size: 12px; }
.block { display: block; }
.nowrap { white-space: nowrap; }

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
  flex-wrap: wrap;
}

.range-picker { display: flex; gap: 6px; }

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

.filter-select {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--text);
}

.coverage-search {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 220px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--background);
  color: var(--text-muted);
}

.coverage-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(176, 85, 47, 0.12);
}

.coverage-search input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.metrics-totals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 12px;
}

.m-stat { padding: 20px; }

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

.range-note { margin-bottom: 24px; }

.panel { margin-bottom: 24px; }

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

.header-with-icon h4 { font-weight: 700; margin: 0; }

.text-blue { color: #3b82f6; }
.text-purple { color: #a855f7; }
.text-orange { color: #f59e0b; }
.text-green { color: #22c55e; }
.text-danger { color: #ef4444; }

.chart-legend {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px !important;
  border: 1px solid var(--border);
  border-radius: 99px;
  background: var(--background);
  color: var(--text);
  font-size: 12px !important;
}

.legend-item small { color: var(--text-muted); font-size: 10px; }
.legend-item.muted { opacity: 0.45; }

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.swatch-impressions { background: rgba(176, 85, 47, 0.35); }
.swatch-clicks { background: var(--primary); }

.metrics-chart {
  position: relative;
  min-height: 280px;
  padding: 8px 12px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--background);
  overflow: hidden;
}

.chart-svg {
  display: block;
  width: 100%;
  height: 270px;
  overflow: visible;
}

.chart-grid line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.axis-label {
  fill: var(--text-muted);
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
}

.axis-left { text-anchor: end; }
.axis-right { text-anchor: start; }

.impressions-area { fill: rgba(176, 85, 47, 0.1); }

.chart-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.impressions-line { stroke: #c9937d; stroke-width: 2.5; }
.clicks-line { stroke: var(--primary); stroke-width: 3; }

.chart-active line {
  stroke: var(--text-muted);
  stroke-width: 1;
  stroke-dasharray: 4 4;
  vector-effect: non-scaling-stroke;
}

.chart-active circle {
  stroke: var(--background);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.point-impressions { fill: #c9937d; }
.point-clicks { fill: var(--primary); }

.chart-hit-area { fill: transparent; cursor: crosshair; }
.chart-hit-area:focus { outline: none; }

.chart-tooltip {
  position: absolute;
  z-index: 2;
  top: 18px;
  width: 184px;
  padding: 10px 12px;
  transform: translateX(-50%);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  pointer-events: none;
}

.chart-tooltip strong,
.chart-tooltip span,
.chart-tooltip small { display: flex; align-items: center; gap: 7px; }
.chart-tooltip strong { margin-bottom: 7px; font-size: 13px; text-transform: capitalize; }
.chart-tooltip span { margin-top: 4px; font-size: 12px; }
.chart-tooltip small { margin-top: 7px; color: var(--text-muted); font-size: 10px; }

.panel-grid {
  display: grid;
  /* minmax(0, 1fr) por lo mismo que en Analítica: con 1fr el mínimo es el contenido
     y una celda sin wrap impide encoger la columna, desbordando en móvil. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.truncate {
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table a:hover { color: var(--primary); }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.badge-success { background: rgba(34, 197, 94, 0.15); color: #15803d; }
.badge-warning { background: rgba(245, 158, 11, 0.15); color: #b45309; }
.badge-danger { background: rgba(239, 68, 68, 0.15); color: #b91c1c; }
.badge-muted { background: var(--background); color: var(--text-muted); }

.btn-link {
  display: inline-block;
  margin-left: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  font-size: 12px;
  text-decoration: none;
}

.setup-card { padding: 24px; }

.setup-steps {
  margin: 16px 0 0 20px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-muted);
}

.setup-steps code,
.missing-var {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 12px;
  margin: 0 2px;
}

.help-note {
  margin: -8px 0 16px;
  line-height: 1.6;
}

.inline-note {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--background);
  border: 1px solid var(--border);
  font-size: 13px;
  margin-bottom: 16px;
}

.metrics-empty { padding: 16px 0; font-size: 14px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .metrics-totals { grid-template-columns: repeat(2, 1fr); }
  .panel-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 640px) {
  .metrics-totals { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .panel .table { table-layout: fixed; }
  .panel .table th:first-child { width: 40%; }
  .panel .table th,
  .panel .table td { padding: 10px 8px; }
  .truncate { max-width: none; }
  .chart-legend { width: 100%; }
  .legend-item { flex: 1; justify-content: center; }
  .legend-item small { display: none; }
  .coverage-search { width: 100%; min-width: 0; }
  .metrics-chart { min-height: 140px; padding-inline: 4px; }
  .chart-svg { height: 125px; }
  .axis-label { font-size: 24px; }
  .chart-dates text:nth-child(even) { display: none; }
  .chart-tooltip { top: 8px; }
}
</style>
