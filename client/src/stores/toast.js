import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
    const toasts = ref([])

    function add(message, type = 'success', duration = 3000) {
        const id = Date.now() + Math.random()
        toasts.value.push({ id, message, type })

        setTimeout(() => {
            remove(id)
        }, duration)
    }

    function remove(id) {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return { toasts, add, remove, success: (m) => add(m, 'success'), error: (m) => add(m, 'error'), info: (m) => add(m, 'info') }
})
