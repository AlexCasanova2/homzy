<template>
  <div class="toast-container">
    <TransitionGroup name="toast-list">
      <div 
        v-for="toast in store.toasts" 
        :key="toast.id" 
        class="toast-item glass"
        :class="toast.type"
      >
        <div class="toast-icon">
          <CheckCircleIcon v-if="toast.type === 'success'" :size="18" />
          <AlertCircleIcon v-else-if="toast.type === 'error'" :size="18" />
          <InfoIcon v-else :size="18" />
        </div>
        <div class="toast-content">
          {{ toast.message }}
        </div>
        <button class="toast-close" @click="store.remove(toast.id)">
          <XIcon :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'
import { CheckCircleIcon, AlertCircleIcon, InfoIcon, XIcon } from 'lucide-vue-next'

const store = useToastStore()
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 9999;
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  min-width: 300px;
  max-width: 450px;
  padding: 16px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-item.success {
  background: rgba(22, 163, 74, 0.9);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.toast-item.error {
  background: rgba(220, 38, 38, 0.9);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.toast-item.info {
  background: rgba(37, 99, 235, 0.9);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
}

.toast-content {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.toast-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Transitions */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s ease;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
