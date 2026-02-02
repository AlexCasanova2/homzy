<template>
  <div class="dashboard-home">
    <!-- Header with quick actions -->
    <header class="dashboard-header animate-fade-in">
      <div>
        <h2>Resumen de Rendimiento</h2>
        <p class="text-muted">Controla el pulso de tu sitio de afiliación en tiempo real.</p>
      </div>
      <div class="header-actions">
        <button class="secondary small" @click="loadStats">
          <RefreshCwIcon :size="14" :class="{ 'spin': loading }" class="mr-8" /> 
          Actualizar
        </button>
        <RouterLink to="/admin/articles" class="primary small">
          <PlusIcon :size="14" class="mr-8" />
          Nuevo Artículo
        </RouterLink>
      </div>
    </header>

    <!-- Essential Stats -->
    <div class="stats-grid">
      <div class="stat-card card reveal delay-1">
        <div class="stat-header">
          <span class="stat-icon bg-blue-soft"><FileTextIcon :size="20" class="text-blue" /></span>
          <span class="stat-trend positive">{{ stats.publishedPct }}% Pub.</span>
        </div>
        <p class="stat-label">Artículos Totales</p>
        <h3 class="stat-value">{{ stats.articlesTotal }}</h3>
      </div>
      
      <div class="stat-card card reveal delay-2">
        <div class="stat-header">
          <span class="stat-icon bg-purple-soft"><PackageIcon :size="20" class="text-purple" /></span>
          <span class="stat-trend positive">+{{ stats.newProducts }} hoy</span>
        </div>
        <p class="stat-label">Catálogo Productos</p>
        <h3 class="stat-value">{{ stats.productsTotal }}</h3>
      </div>

      <div class="stat-card card reveal delay-3">
        <div class="stat-header">
          <span class="stat-icon bg-orange-soft"><MailIcon :size="20" class="text-orange" /></span>
          <span class="stat-trend positive">Activa</span>
        </div>
        <p class="stat-label">Suscriptores Newsletter</p>
        <h3 class="stat-value">{{ stats.subscribersTotal }}</h3>
      </div>

      <div class="stat-card card reveal delay-4">
        <div class="stat-header">
          <span class="stat-icon bg-green-soft"><TagIcon :size="20" class="text-green" /></span>
        </div>
        <p class="stat-label">Categorías Activas</p>
        <h3 class="stat-value">{{ stats.categoriesCount }}</h3>
      </div>
    </div>

    <!-- Main Content Panels -->
    <div class="admin-panels">
      <!-- Recent Activity Section -->
      <section class="panel card reveal delay-5">
        <div class="panel-header">
          <div class="header-with-icon">
            <ZapIcon :size="18" class="text-orange" />
            <h4>Actividad Reciente</h4>
          </div>
          <RouterLink to="/admin/articles" class="link-text">Ver todo</RouterLink>
        </div>
        <div class="activity-feed">
          <div v-for="item in recentItems" :key="item.id" class="activity-item">
            <div class="activity-dot" :class="item.type"></div>
            <div class="activity-info">
              <p><strong>{{ item.title }}</strong></p>
              <span class="activity-meta">{{ item.date }} • {{ item.typeLabel }}</span>
            </div>
          </div>
          <div v-if="recentItems.length === 0" class="empty-state">
            Cargando actividad...
          </div>
        </div>
      </section>

      <!-- Advanced Tools Section -->
      <section class="panel-column flex-column gap-24">
        <!-- AI Tools Banner -->
        <div class="panel card tools-card reveal delay-6">
          <div class="tools-content">
            <div class="tools-badge">Premium AI</div>
            <h4>Generador Automático</h4>
            <p>Convierte productos de Amazon en entradas de blog SEO optimizadas en segundos.</p>
            <div class="tools-footer">
              <button class="primary small shadow-lg">Iniciar Scraper</button>
              <span class="text-xs text-muted">Llama 3.1 70B Activo</span>
            </div>
          </div>
        </div>

        <!-- Health & SEO Check -->
        <div class="panel card reveal delay-7">
          <div class="panel-header">
            <h4>Estado del Sitio</h4>
          </div>
          <div class="health-metrics">
            <div class="metric">
              <span>SEO Score</span>
              <div class="progress-container"><div class="progress-bar" style="width: 92%"></div></div>
              <span class="metric-val">92/100</span>
            </div>
            <div class="metric">
              <span>Borradores</span>
              <div class="progress-container"><div class="progress-bar orange" :style="{ width: stats.draftsPct + '%' }"></div></div>
              <span class="metric-val">{{ stats.articlesDrafts }} pendientes</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive } from "vue";
import api from "../../api.js";
import { 
  FileTextIcon, 
  PackageIcon, 
  MailIcon, 
  TagIcon,
  RefreshCwIcon,
  ZapIcon,
  PlusIcon
} from "lucide-vue-next";

const loading = ref(false);
const recentItems = ref([]);
const stats = reactive({
  articlesTotal: 0,
  articlesDrafts: 0,
  publishedPct: 0,
  draftsPct: 0,
  productsTotal: 0,
  newProducts: 0,
  subscribersTotal: 0,
  categoriesCount: 0
});

async function loadStats() {
  loading.value = true;
  try {
    const [arts, prods, cats, subs] = await Promise.all([
      api.get("/articles"),
      api.get("/products"),
      api.get("/categories"),
      api.get("/newsletter/subscribers")
    ]);

    const allArticles = arts.data;
    stats.articlesTotal = allArticles.length;
    stats.articlesDrafts = allArticles.filter(a => a.status === 'draft').length;
    stats.publishedPct = stats.articlesTotal ? Math.round(((stats.articlesTotal - stats.articlesDrafts) / stats.articlesTotal) * 100) : 0;
    stats.draftsPct = stats.articlesTotal ? Math.round((stats.articlesDrafts / stats.articlesTotal) * 100) : 0;

    stats.productsTotal = prods.data.length;
    stats.newProducts = prods.data.filter(p => new Date(p.created_at) > new Date(Date.now() - 24*60*60*1000)).length;
    
    stats.categoriesCount = cats.data.length;
    stats.subscribersTotal = subs.data.length;

    // Process recent items (mix of articles and subscribers)
    const combined = [
      ...allArticles.slice(0, 3).map(a => ({
        id: 'art-' + a.id,
        title: a.title,
        date: formatDate(a.created_at),
        type: 'article',
        typeLabel: 'Nuevo Artículo'
      })),
      ...subs.data.slice(0, 2).map(s => ({
        id: 'sub-' + s.id,
        title: s.email,
        date: formatDate(s.created_at),
        type: 'subscriber',
        typeLabel: 'Nueva Suscripción'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    recentItems.value = combined;

  } catch (err) {
    console.error("Error loading dashboard stats", err);
  } finally {
    loading.value = false;
  }
}

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' });
}

onMounted(loadStats);
</script>

<style scoped>
.dashboard-home {
  width: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.dashboard-header h2 {
  font-family: 'Montserrat', sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 24px;
  transition: transform 0.3s ease;
}

.stat-card:hover { transform: translateY(-4px); }

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Soft Backgrounds */
.bg-blue-soft { background: #eff6ff; }
.bg-purple-soft { background: #faf5ff; }
.bg-orange-soft { background: #fffaf2; }
.bg-green-soft { background: #f0fdf4; }

.text-blue { color: #3b82f6; }
.text-purple { color: #a855f7; }
.text-orange { color: #f59e0b; }
.text-green { color: #22c55e; }

.stat-trend {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 99px;
  background: white;
  border: 1px solid var(--border);
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  margin-top: 4px;
}

.admin-panels {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

.activity-feed {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-dot.article { background: var(--primary); }
.activity-dot.subscriber { background: #22c55e; }

.activity-info p {
  font-size: 14px;
  margin-bottom: 4px;
}

.activity-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.tools-card {
  background: var(--user-gradient);
  color: white;
  position: relative;
  overflow: hidden;
}

.tools-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 16px;
}

.tools-footer {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.health-metrics {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric span { font-size: 13px; font-weight: 600; }

.progress-container {
  height: 6px;
  background: var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #22c55e;
}

.progress-bar.orange { background: #f59e0b; }

.metric-val {
  font-size: 12px !important;
  color: var(--text-muted);
  text-align: right;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .admin-panels { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 16px; }
}
</style>
