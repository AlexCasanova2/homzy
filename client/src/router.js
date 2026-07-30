import { createRouter, createWebHistory } from "vue-router";
import PublicHome from "./pages/PublicHome.vue";
import PublicArticle from "./pages/PublicArticle.vue";
import PublicCategories from "./pages/PublicCategories.vue";
import PublicCategory from "./pages/PublicCategory.vue";
import PublicSearch from "./pages/PublicSearch.vue";
import AdminDashboard from "./pages/AdminDashboard.vue";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome.vue";
import AdminProductsPage from "./pages/admin/AdminProductsPage.vue";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage.vue";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage.vue";
import AdminAffiliatesPage from "./pages/admin/AdminAffiliatesPage.vue";
import AdminNewsletterPage from "./pages/admin/AdminNewsletterPage.vue";
import LegalPage from "./pages/LegalPage.vue";
import NotFoundPage from "./pages/NotFoundPage.vue";
import { useAuthStore } from "./stores/auth.js";
import LoginPage from "./pages/LoginPage.vue";

const routes = [
  { path: "/login", component: LoginPage },
  { path: "/privacidad", component: LegalPage, props: { title: "Política de Privacidad" } },
  { path: "/terminos", component: LegalPage, props: { title: "Términos de Servicio" } },
  { path: "/", component: PublicHome },
  { path: "/analisis/:slug", component: PublicArticle },
  { path: "/categorias", component: PublicCategories },
  { path: "/categoria/:slug", component: PublicCategory },
  { path: "/buscar", component: PublicSearch },
  // ... admin routes
  {
    path: "/admin",
    component: AdminDashboard,
    meta: { requiresAuth: true },
    children: [
      { path: "", component: AdminDashboardHome },
      { path: "products", component: AdminProductsPage },
      { path: "articles", component: AdminArticlesPage },
      { path: "categories", component: AdminCategoriesPage },
      { path: "affiliates", component: AdminAffiliatesPage },
      { path: "newsletter", component: AdminNewsletterPage },
    ],
  },
  // Catch-all 404
  { path: "/:pathMatch(.*)*", component: NotFoundPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // Atrás/adelante del navegador conserva la posición; navegar a una página nueva empieza arriba.
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    const valid = await auth.checkAuth();
    if (!valid) return { path: "/login", query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;
