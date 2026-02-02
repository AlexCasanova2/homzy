<template>
  <div class="login-page">
    <div class="login-card card glass">
      <div class="brand-center">
        <div class="brand__logo">H</div>
        <h1>Homzy Admin</h1>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Usuario {{ isSetupMode ? '(Nuevo Admin)' : '' }}</label>
          <input v-model="username" type="text" required autofocus />
        </div>
        
        <div class="form-group">
          <label>Contraseña {{ isSetupMode ? '(Nueva)' : '' }}</label>
          <input v-model="password" type="password" required />
        </div>

        <div v-if="error" class="error-msg">
          {{ error }}
        </div>

        <button type="submit" class="primary btn-block" :disabled="loading">
          {{ loading ? 'Procesando...' : (isSetupMode ? 'Crear Cuenta' : 'Iniciar Sesión') }}
        </button>
      </form>
      
      <!-- Only show if setup is NOT required but user wants to try (rare case) or purely informational -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import api from "../api.js";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const isSetupMode = ref(false);

const auth = useAuthStore();
const router = useRouter();

onMounted(async () => {
  try {
    // Check if we need to run setup
    const { data } = await api.get("/auth/setup-check");
    if (data.canSetup) {
      isSetupMode.value = true;
      error.value = "Bienvenido. No hay usuarios registrados. Crea tu cuenta de Administrador.";
    }
  } catch (e) {
    console.error("Error checking setup status");
  }
});

async function handleSubmit() {
  loading.value = true;
  error.value = "";
  try {
    if (isSetupMode.value) {
       await api.post("/auth/setup", { username: username.value, password: password.value });
       // Auto login after setup
       await auth.login(username.value, password.value);
    } else {
       await auth.login(username.value, password.value);
    }
    router.push("/admin");
  } catch (err) {
    error.value = err.response?.data?.error || "Error de autenticación";
  } finally {
    loading.value = false;
  }
}

// ... logic handled in handleSubmit

</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
}

.brand-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.brand__logo {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--user-gradient);
  color: white;
  font-weight: 800;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 24px;
}

h1 {
  font-size: 24px;
  font-family: 'Montserrat', sans-serif;
  color: var(--text);
}

.btn-block {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
}

.error-msg {
  color: #ef4444;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  padding: 8px;
  background: #fee2e2;
  border-radius: 6px;
}
</style>
