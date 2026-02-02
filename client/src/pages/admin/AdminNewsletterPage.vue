<template>
  <div class="newsletter-manager">
    <section class="card">
      <div class="section-header">
        <span class="header-icon"><MailIcon :size="20" /></span>
        <div class="header-info">
          <h3>Suscriptores de Newsletter</h3>
          <p>Listado de emails registrados para recibir reseñas</p>
        </div>
        <div class="flex gap-2">
          <button class="secondary small" @click="downloadCSV" :disabled="!subscribers.length">
            <DownloadIcon :size="16" class="mr-8" />
            Exportar CSV
          </button>
          <div class="stats-badge secondary">
            {{ subscribers.length }} Suscriptores
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Fecha Registro</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in subscribers" :key="sub.id">
              <td class="text-muted text-xs">{{ sub.id }}</td>
              <td class="font-bold">{{ sub.email }}</td>
              <td>{{ formatDate(sub.created_at) }}</td>
              <td class="text-right">
                <button class="danger small" title="Eliminar (No implementado)">
                   <Trash2Icon :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="subscribers.length === 0">
              <td colspan="4" class="text-center py-40 text-muted">No hay suscriptores registrados aún.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../../api.js";
import { MailIcon, Trash2Icon, DownloadIcon } from "lucide-vue-next";

const subscribers = ref([]);

async function loadSubscribers() {
  try {
    const { data } = await api.get("/newsletter/subscribers");
    subscribers.value = data;
  } catch (err) {
    console.error("Error loading subscribers", err);
  }
}

function downloadCSV() {
  if (subscribers.value.length === 0) return;
  
  // Create CSV content
  const headers = ["ID", "Email", "Fecha Registro"];
  const rows = subscribers.value.map(s => [
    s.id,
    s.email,
    new Date(s.created_at).toLocaleString("es-ES")
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `homzy_newsletter_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDate(val) {
  if (!val) return "";
  return new Date(val).toLocaleString("es-ES");
}

onMounted(loadSubscribers);
</script>

<style scoped>
.newsletter-manager {
  max-width: 1000px;
}

.stats-badge {
  padding: 6px 16px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 99px;
  font-weight: 700;
  font-size: 13px;
}

.text-xs { font-size: 11px; }

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-info { flex: 1; }

.header-icon {
  width: 40px;
  height: 40px;
  background: var(--user-gradient);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
</style>
