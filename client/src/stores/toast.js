import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
    const toasts = ref([])

    // action opcional: { label, to } — muestra un botón que navega a esa ruta.
    function add(message, type = 'success', duration = 3000, action = null) {
        const id = Date.now() + Math.random()
        toasts.value.push({ id, message, type, action })

        setTimeout(() => {
            remove(id)
        }, action ? Math.max(duration, 8000) : duration)
    }

    function remove(id) {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts,
        add,
        remove,
        success: (m, action = null) => add(m, 'success', 3000, action),
        error: (m) => add(m, 'error'),
        info: (m, action = null) => add(m, 'info', 3000, action),
    }
})
