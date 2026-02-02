<template>
  <div class="dashboard-home">
    <div class="stats-grid">
      <div class="stat-card card">
        <div class="stat-header">
          <span class="stat-icon"><FileTextIcon :size="24" class="text-primary" /></span>
          <span class="stat-trend positive">+12%</span>
        </div>
        <p class="stat-label">Artículos</p>
        <h3 class="stat-value">120</h3>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <span class="stat-icon"><PenToolIcon :size="24" class="text-primary" /></span>
          <span class="stat-trend positive">+4%</span>
        </div>
        <p class="stat-label">Borradores</p>
        <h3 class="stat-value">34</h3>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <span class="stat-icon"><PackageIcon :size="24" class="text-primary" /></span>
          <span class="stat-trend negative">-2%</span>
        </div>
        <p class="stat-label">Productos</p>
        <h3 class="stat-value">480</h3>
      </div>
      <div class="stat-card card">
        <div class="stat-header">
          <span class="stat-icon"><BarChartIcon :size="24" class="text-primary" /></span>
          <span class="stat-trend positive">+0.4%</span>
        </div>
        <p class="stat-label">Conversión</p>
        <h3 class="stat-value">3.8%</h3>
      </div>
    </div>

    <div class="admin-panels">
      <div class="panel card">
        <div class="panel-header">
          <h4>Actividad reciente</h4>
          <span class="badge">En vivo</span>
        </div>
        <p>Últimos productos importados y artículos generados con IA.</p>
        <div class="activity-feed">
          <div class="activity-item">
            <span class="dot"></span>
            <p><strong>Aspiradora Dyson V15</strong> importada con éxito.</p>
          </div>
        </div>
      </div>
      
      <div class="panel card banner-panel">
        <h4>Generador de Artículos</h4>
        <p>Crea contenido SEO optimizado con un solo clic usando Llama 3.1.</p>
        <button class="primary shadow-lg">Probar ahora</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  FileTextIcon, 
  PenToolIcon, 
  PackageIcon, 
  BarChartIcon 
} from "lucide-vue-next";
</script>

<style scoped>
.text-primary { color: var(--primary); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  flex-direction: column;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-top: 4px;
}

.stat-trend {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.stat-trend.positive {
  background: #dcfce7;
  color: #166534;
}

.stat-trend.negative {
  background: #fee2e2;
  color: #991b1b;
}

.admin-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.banner-panel {
  background: var(--user-gradient);
  border-color: rgba(74, 144, 226, 0.3);
}

.banner-panel h4 {
  font-size: 18px;
  margin-bottom: 8px;
}

.banner-panel p {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.activity-feed {
  margin-top: 20px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.activity-item p {
  font-size: 13px;
}
</style>
