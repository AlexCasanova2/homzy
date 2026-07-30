import { computed, ref, watch } from "vue";

// 0 = "Todos": mantiene la lista completa sin trocear.
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 0];
export const DEFAULT_PAGE_SIZE = 25;

function readStoredSize(storageKey) {
  if (!storageKey) return DEFAULT_PAGE_SIZE;
  try {
    const stored = Number(localStorage.getItem(storageKey));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function persistSize(storageKey, value) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, String(value));
  } catch {
    // Modo privado o almacenamiento lleno: la preferencia solo dura la sesión.
  }
}

/**
 * Paginación en cliente sobre una lista reactiva ya cargada.
 * `storageKey` recuerda el tamaño de página elegido entre visitas.
 */
export function usePagination(items, { storageKey } = {}) {
  const page = ref(1);
  const pageSize = ref(readStoredSize(storageKey));

  const total = computed(() => items.value?.length ?? 0);
  const totalPages = computed(() => {
    if (pageSize.value === 0) return 1;
    return Math.max(1, Math.ceil(total.value / pageSize.value));
  });

  const paginated = computed(() => {
    if (pageSize.value === 0) return items.value ?? [];
    const start = (page.value - 1) * pageSize.value;
    return (items.value ?? []).slice(start, start + pageSize.value);
  });

  // Al cambiar el tamaño volvemos al principio: mantener la página N con otro tamaño desorienta.
  watch(pageSize, (value) => {
    page.value = 1;
    persistSize(storageKey, value);
  });

  // Si se borran filas y la página actual deja de existir, retrocedemos en lugar de mostrar una tabla vacía.
  watch(totalPages, (max) => {
    if (page.value > max) page.value = max;
  });

  return { page, pageSize, total, totalPages, paginated };
}
