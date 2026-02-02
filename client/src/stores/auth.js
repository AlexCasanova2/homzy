import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "../api.js";

export const useAuthStore = defineStore("auth", () => {
    const token = ref(localStorage.getItem("token") || null);
    const user = ref(JSON.parse(localStorage.getItem("user") || "null"));

    const isAuthenticated = computed(() => !!token.value);
    const isAdmin = computed(() => !!token.value); // Currently any user is admin

    function setAuth(t, u) {
        token.value = t;
        user.value = u;
        localStorage.setItem("token", t);
        localStorage.setItem("user", JSON.stringify(u));
        // Set axios default
        api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete api.defaults.headers.common["Authorization"];
        window.location.href = "/";
    }

    async function login(username, password) {
        try {
            const { data } = await api.post("/auth/login", { username, password });
            setAuth(data.token, data.user);
            return true;
        } catch (e) {
            throw e;
        }
    }

    async function checkAuth() {
        if (!token.value) return false;
        api.defaults.headers.common["Authorization"] = `Bearer ${token.value}`;
        try {
            const { data } = await api.get("/auth/me");
            return true;
        } catch (e) {
            logout();
            return false;
        }
    }

    return {
        token,
        user,
        isAuthenticated,
        isAdmin, // Exposed for App.vue
        login,
        logout,
        checkAuth
    };
});
