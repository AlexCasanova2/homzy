<template>
  <nav v-if="total > 0" class="table-pagination" :aria-label="`Paginación de ${label}`">
    <div class="page-size">
      <label :for="selectId">Mostrar</label>
      <select :id="selectId" :value="pageSize" @change="onSizeChange">
        <option v-for="option in options" :key="option" :value="option">
          {{ option === 0 ? "Todos" : option }}
        </option>
      </select>
      <span class="page-size-suffix">{{ label }} por página</span>
    </div>

    <p class="page-range" aria-live="polite">
      <strong>{{ rangeStart }}-{{ rangeEnd }}</strong> de {{ total }}
    </p>

    <div v-if="totalPages > 1" class="page-controls">
      <button class="secondary small" :disabled="page === 1" @click="go(page - 1)" title="Página anterior">
        <ChevronLeftIcon :size="14" />
      </button>

      <template v-for="item in pageItems" :key="item.key">
        <span v-if="item.gap" class="page-gap">…</span>
        <button
          v-else
          class="small page-number"
          :class="item.value === page ? 'primary' : 'secondary'"
          :aria-current="item.value === page ? 'page' : undefined"
          @click="go(item.value)"
        >
          {{ item.value }}
        </button>
      </template>

      <button class="secondary small" :disabled="page === totalPages" @click="go(page + 1)" title="Página siguiente">
        <ChevronRightIcon :size="14" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-vue-next";
import { PAGE_SIZE_OPTIONS } from "../composables/usePagination.js";

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  label: { type: String, default: "elementos" },
  options: { type: Array, default: () => PAGE_SIZE_OPTIONS },
});

const emit = defineEmits(["update:page", "update:pageSize"]);

const selectId = `page-size-${Math.random().toString(36).slice(2, 8)}`;

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * (props.pageSize || props.total) + 1));
const rangeEnd = computed(() => (props.pageSize === 0 ? props.total : Math.min(props.page * props.pageSize, props.total)));

// Ventana de páginas: primera, última y las vecinas de la actual, con elipsis en los saltos.
const pageItems = computed(() => {
  const last = props.totalPages;
  const visible = new Set([1, last, props.page - 1, props.page, props.page + 1]);
  const items = [];
  let previous = 0;

  for (let n = 1; n <= last; n += 1) {
    if (!visible.has(n)) continue;
    if (previous && n - previous > 1) items.push({ key: `gap-${n}`, gap: true });
    items.push({ key: `page-${n}`, value: n });
    previous = n;
  }
  return items;
});

function go(target) {
  const next = Math.min(Math.max(target, 1), props.totalPages);
  if (next !== props.page) emit("update:page", next);
}

function onSizeChange(event) {
  emit("update:pageSize", Number(event.target.value));
}
</script>

<style scoped>
.table-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.page-size {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.page-size label {
  margin: 0;
  font-weight: 600;
  color: var(--text);
}

.page-size select {
  width: auto;
  min-width: 84px;
  padding: 6px 10px;
  font-size: 13px;
}

.page-range {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.page-number {
  min-width: 34px;
  justify-content: center;
}

.page-gap {
  padding: 0 2px;
  color: var(--text-muted);
}

@media (max-width: 700px) {
  .table-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .page-controls {
    margin-left: 0;
    justify-content: center;
    flex-wrap: wrap;
  }

  .page-size-suffix {
    flex: 1;
  }
}
</style>
