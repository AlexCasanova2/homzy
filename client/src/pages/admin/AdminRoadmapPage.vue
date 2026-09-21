<template>
  <div class="roadmap-page">
    <header class="roadmap-header">
      <div>
        <span class="eyebrow">Plan de crecimiento</span>
        <h2>Roadmap SEO</h2>
        <p>Objetivos priorizados para aumentar indexación, autoridad y tráfico orgánico.</p>
      </div>
      <button class="primary" @click="openCreate">
        <PlusIcon :size="17" /> Nuevo objetivo
      </button>
    </header>

    <section class="progress-panel card">
      <div class="progress-copy">
        <span>Progreso general</span>
        <strong>{{ overallProgress }}%</strong>
      </div>
      <div class="progress-track" role="progressbar" :aria-valuenow="overallProgress" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${overallProgress}%` }"></span>
      </div>
      <div class="progress-stats">
        <span><strong>{{ counts.completed }}</strong> completados</span>
        <span><strong>{{ counts.in_progress }}</strong> en curso</span>
        <span><strong>{{ counts.pending }}</strong> pendientes</span>
        <span v-if="counts.blocked"><strong>{{ counts.blocked }}</strong> bloqueados</span>
      </div>
    </section>

    <div class="roadmap-toolbar card">
      <label>
        <span>Estado</span>
        <select v-model="statusFilter">
          <option value="all">Todos</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>Prioridad</span>
        <select v-model="priorityFilter">
          <option value="all">Todas</option>
          <option v-for="option in priorityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <button class="secondary small refresh-button" :disabled="loading" @click="loadItems">
        <RefreshCwIcon :size="15" :class="{ spin: loading }" /> Actualizar
      </button>
    </div>

    <div v-if="loading && !items.length" class="loading-state card">Cargando roadmap...</div>

    <div v-else class="phase-list">
      <section v-for="phase in visiblePhases" :key="phase.value" class="phase-section">
        <div class="phase-heading">
          <div>
            <span class="phase-number">{{ phase.step }}</span>
            <div>
              <h3>{{ phase.label }}</h3>
              <p>{{ phase.description }}</p>
            </div>
          </div>
          <span class="phase-progress">{{ phaseProgress(phase.value) }}%</span>
        </div>

        <div class="objective-grid">
          <article v-for="item in itemsForPhase(phase.value)" :key="item.id" class="objective-card card" :class="`status-${item.status}`">
            <div class="objective-topline">
              <span class="priority-pill" :class="`priority-${item.priority}`">{{ priorityLabel(item.priority) }}</span>
              <span class="status-pill" :class="`status-pill-${item.status}`">{{ statusLabel(item.status) }}</span>
            </div>
            <h4>{{ item.title }}</h4>
            <p v-if="item.description" class="objective-description">{{ item.description }}</p>
            <p v-if="item.dueDate" class="due-date" :class="{ overdue: isOverdue(item) }">
              <CalendarIcon :size="14" /> Objetivo: {{ formatDate(item.dueDate) }}
            </p>
            <div class="objective-actions">
              <button v-if="item.status !== 'completed'" class="secondary small" :disabled="savingId === item.id" @click="setStatus(item, 'completed')">
                <CheckIcon :size="14" /> Completar
              </button>
              <button v-else class="secondary small" :disabled="savingId === item.id" @click="setStatus(item, 'in_progress')">
                <RotateCcwIcon :size="14" /> Reabrir
              </button>
              <button class="icon-button" title="Editar objetivo" :disabled="savingId === item.id" @click="openEdit(item)"><PencilIcon :size="15" /></button>
              <button class="icon-button danger-icon" title="Eliminar objetivo" :disabled="savingId === item.id" @click="removeItem(item)"><Trash2Icon :size="15" /></button>
            </div>
          </article>

          <button v-if="!itemsForPhase(phase.value).length" class="empty-phase" @click="openCreate(phase.value)">
            <PlusIcon :size="18" /> Añadir un objetivo a esta fase
          </button>
        </div>
      </section>
      <div v-if="!visiblePhases.length" class="loading-state card">
        No hay objetivos que coincidan con los filtros seleccionados.
        <button class="secondary small" @click="statusFilter = 'all'; priorityFilter = 'all'">Limpiar filtros</button>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <section class="roadmap-modal card" role="dialog" aria-modal="true" :aria-labelledby="formTitleId">
        <div class="modal-header">
          <div>
            <span class="eyebrow">{{ editingId ? "Actualizar objetivo" : "Nuevo objetivo" }}</span>
            <h3 :id="formTitleId">{{ editingId ? "Editar objetivo" : "Añadir al roadmap" }}</h3>
          </div>
          <button class="icon-button" title="Cerrar" @click="closeForm"><XIcon :size="18" /></button>
        </div>

        <form class="roadmap-form" @submit.prevent="saveItem">
          <label class="full-field">
            <span>Título</span>
            <input v-model.trim="form.title" required minlength="3" maxlength="180" placeholder="Ej. Optimizar las páginas cercanas al top 10" />
          </label>
          <label class="full-field">
            <span>Descripción</span>
            <textarea v-model.trim="form.description" rows="4" maxlength="3000" placeholder="Resultado esperado y criterio para considerar el objetivo completado"></textarea>
          </label>
          <label>
            <span>Fase</span>
            <select v-model="form.phase" required>
              <option v-for="phase in phases" :key="phase.value" :value="phase.value">{{ phase.label }}</option>
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select v-model="form.status" required>
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>
            <span>Prioridad</span>
            <select v-model="form.priority" required>
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>
            <span>Fecha objetivo</span>
            <input v-model="form.dueDate" type="date" />
          </label>
          <div class="form-actions full-field">
            <button type="button" class="secondary" @click="closeForm">Cancelar</button>
            <button type="submit" class="primary" :disabled="saving">
              {{ saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear objetivo" }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import api from "../../api.js";
import { useToastStore } from "../../stores/toast.js";
import {
  CalendarIcon, CheckIcon, PencilIcon, PlusIcon, RefreshCwIcon,
  RotateCcwIcon, Trash2Icon, XIcon,
} from "lucide-vue-next";

const phases = [
  { value: "foundation", step: "01", label: "Semanas 1-2", description: "Base técnica, indexación y oportunidades inmediatas" },
  { value: "growth", step: "02", label: "Semanas 3-6", description: "Clusters, comparativas y crecimiento editorial" },
  { value: "authority", step: "03", label: "Semanas 7-12", description: "Autoridad, optimización y distribución" },
  { value: "ongoing", step: "∞", label: "Objetivos continuos", description: "Métricas que se revisan durante todo el ciclo" },
];
const statusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completado" },
  { value: "blocked", label: "Bloqueado" },
];
const priorityOptions = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const toast = useToastStore();
const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const savingId = ref(null);
const showForm = ref(false);
const editingId = ref(null);
const statusFilter = ref("all");
const priorityFilter = ref("all");
const formTitleId = "roadmap-form-title";
const form = reactive(emptyForm());

function emptyForm(phase = "foundation") {
  return { phase, title: "", description: "", status: "pending", priority: "high", dueDate: "" };
}

const filteredItems = computed(() => items.value.filter((item) =>
  (statusFilter.value === "all" || item.status === statusFilter.value)
  && (priorityFilter.value === "all" || item.priority === priorityFilter.value)
));
const visiblePhases = computed(() => phases.filter((phase) =>
  itemsForPhase(phase.value).length || (statusFilter.value === "all" && priorityFilter.value === "all")
));
const counts = computed(() => statusOptions.reduce((acc, option) => {
  acc[option.value] = items.value.filter((item) => item.status === option.value).length;
  return acc;
}, {}));
const overallProgress = computed(() => items.value.length
  ? Math.round((counts.value.completed / items.value.length) * 100)
  : 0);

function itemsForPhase(phase) {
  return filteredItems.value.filter((item) => item.phase === phase);
}

function phaseProgress(phase) {
  const phaseItems = items.value.filter((item) => item.phase === phase);
  if (!phaseItems.length) return 0;
  return Math.round((phaseItems.filter((item) => item.status === "completed").length / phaseItems.length) * 100);
}

function statusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || value;
}

function priorityLabel(value) {
  return priorityOptions.find((option) => option.value === value)?.label || value;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(item) {
  return item.status !== "completed" && item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10);
}

async function loadItems() {
  loading.value = true;
  try {
    const { data } = await api.get("/roadmap");
    items.value = data;
  } catch (error) {
    toast.error(error.response?.data?.error || "No se pudo cargar el roadmap");
  } finally {
    loading.value = false;
  }
}

function openCreate(phase = "foundation") {
  editingId.value = null;
  Object.assign(form, emptyForm(typeof phase === "string" ? phase : "foundation"));
  showForm.value = true;
}

function openEdit(item) {
  editingId.value = item.id;
  Object.assign(form, {
    phase: item.phase,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate || "",
  });
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

function payload(values, sortOrder) {
  return {
    phase: values.phase,
    title: values.title,
    description: values.description || "",
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate || null,
    ...(sortOrder === undefined ? {} : { sortOrder }),
  };
}

async function saveItem() {
  saving.value = true;
  try {
    if (editingId.value) {
      const current = items.value.find((item) => item.id === editingId.value);
      await api.put(`/roadmap/${editingId.value}`, payload(form, current?.sortOrder));
      toast.success("Objetivo actualizado");
    } else {
      await api.post("/roadmap", payload(form));
      toast.success("Objetivo añadido al roadmap");
    }
    closeForm();
    await loadItems();
  } catch (error) {
    toast.error(error.response?.data?.error || "No se pudo guardar el objetivo");
  } finally {
    saving.value = false;
  }
}

async function setStatus(item, status) {
  savingId.value = item.id;
  try {
    const { data } = await api.put(`/roadmap/${item.id}`, payload({ ...item, status }, item.sortOrder));
    items.value = items.value.map((current) => current.id === item.id ? data : current);
    toast.success(status === "completed" ? "Objetivo completado" : "Objetivo reabierto");
  } catch (error) {
    toast.error(error.response?.data?.error || "No se pudo actualizar el objetivo");
  } finally {
    savingId.value = null;
  }
}

async function removeItem(item) {
  if (!window.confirm(`¿Eliminar el objetivo “${item.title}”?`)) return;
  try {
    await api.delete(`/roadmap/${item.id}`);
    items.value = items.value.filter((current) => current.id !== item.id);
    toast.success("Objetivo eliminado");
  } catch (error) {
    toast.error(error.response?.data?.error || "No se pudo eliminar el objetivo");
  }
}

onMounted(loadItems);
</script>

<style scoped>
.roadmap-page { width: 100%; max-width: 1320px; }
.roadmap-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 22px; }
.roadmap-header h2 { margin: 4px 0 6px; font-size: clamp(28px, 4vw, 42px); }
.roadmap-header p, .phase-heading p { color: var(--text-muted); margin: 0; }
.roadmap-header button, .objective-actions button, .refresh-button { display: inline-flex; align-items: center; gap: 7px; }
.eyebrow { color: var(--primary); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.progress-panel { padding: 24px; margin-bottom: 16px; background: linear-gradient(120deg, #fff 0%, #fff8f3 100%); }
.progress-copy { display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; }
.progress-copy strong { color: var(--primary); font-size: 30px; }
.progress-track { height: 12px; background: #eadfd8; border-radius: 99px; margin: 12px 0 16px; overflow: hidden; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--primary), #d38a5f); transition: width .25s ease; }
.progress-stats { display: flex; flex-wrap: wrap; gap: 10px 24px; color: var(--text-muted); font-size: 13px; }
.progress-stats strong { color: var(--text); }
.roadmap-toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 14px; padding: 16px 20px; margin-bottom: 28px; }
.roadmap-toolbar label { min-width: 180px; }
.roadmap-toolbar label span, .roadmap-form label span { display: block; margin-bottom: 6px; color: var(--text-muted); font-size: 12px; font-weight: 700; }
.refresh-button { margin-left: auto; }
.phase-list { display: grid; gap: 34px; }
.phase-heading, .phase-heading > div { display: flex; align-items: center; gap: 14px; }
.phase-heading { justify-content: space-between; margin-bottom: 14px; }
.phase-heading h3 { margin: 0 0 3px; font-size: 21px; }
.phase-number { display: grid; place-items: center; width: 42px; height: 42px; flex: none; border: 1px solid #e5cbbd; border-radius: 50%; color: var(--primary); font-weight: 800; }
.phase-progress { color: var(--primary); font-size: 14px; font-weight: 800; }
.objective-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.objective-card { position: relative; min-height: 210px; padding: 20px; border-top: 3px solid #d9cfc9; }
.objective-card.status-in_progress { border-top-color: #d88449; }
.objective-card.status-completed { border-top-color: #3d9b75; background: #fbfffd; }
.objective-card.status-blocked { border-top-color: #c75b5b; }
.objective-topline { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.priority-pill, .status-pill { border-radius: 99px; padding: 4px 9px; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.priority-high { background: #fff0e8; color: #a84920; }
.priority-medium { background: #f4f0ff; color: #6c52a2; }
.priority-low { background: #eef3f5; color: #52656d; }
.status-pill-pending { background: #f1eeeb; color: #6d625c; }
.status-pill-in_progress { background: #fff0df; color: #9b5b20; }
.status-pill-completed { background: #e7f6ef; color: #28775a; }
.status-pill-blocked { background: #fdeaea; color: #9f3f3f; }
.objective-card h4 { margin: 0 0 9px; font-size: 17px; line-height: 1.3; }
.objective-description { color: var(--text-muted); font-size: 13px; line-height: 1.55; margin: 0 0 16px; }
.due-date { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 12px; margin: 0 0 16px; }
.due-date.overdue { color: #a43d3d; font-weight: 700; }
.objective-actions { display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 4px; }
.objective-card { display: flex; flex-direction: column; }
.objective-actions .secondary { margin-right: auto; }
.icon-button { display: inline-grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 1px solid var(--border); border-radius: 9px; background: white; color: var(--text-muted); }
.icon-button:hover { color: var(--primary); border-color: var(--primary); }
.icon-button:disabled { cursor: wait; opacity: .45; }
.danger-icon:hover { color: #ad3f3f; border-color: #dca0a0; }
.empty-phase { min-height: 120px; border: 1px dashed #cfbbae; border-radius: var(--radius-lg); background: transparent; color: var(--text-muted); }
.loading-state { display: grid; justify-items: center; gap: 14px; padding: 48px; text-align: center; color: var(--text-muted); }
.modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(35, 27, 23, .55); backdrop-filter: blur(4px); }
.roadmap-modal { width: min(680px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 26px; }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
.modal-header h3 { margin: 4px 0 0; font-size: 25px; }
.roadmap-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.roadmap-form input, .roadmap-form select, .roadmap-form textarea { width: 100%; }
.roadmap-form textarea { resize: vertical; }
.full-field { grid-column: 1 / -1; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1080px) { .objective-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) {
  .roadmap-header { align-items: stretch; flex-direction: column; }
  .roadmap-header button { justify-content: center; }
  .objective-grid, .roadmap-form { grid-template-columns: 1fr; }
  .full-field { grid-column: auto; }
  .roadmap-toolbar label { width: 100%; }
  .refresh-button { width: 100%; justify-content: center; margin-left: 0; }
  .phase-heading p { display: none; }
  .progress-stats { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
