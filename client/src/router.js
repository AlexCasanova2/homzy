import { createRouter, createWebHistory } from "vue-router";
import PublicHome from "./pages/PublicHome.vue";
import PublicArticle from "./pages/PublicArticle.vue";
import PublicCategories from "./pages/PublicCategories.vue";
import PublicCategory from "./pages/PublicCategory.vue";
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
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  // if (to.meta.requiresAuth && !auth.isAuthenticated) {
  //   // Try to restore session
  //   const valid = await auth.checkAuth();
  //   if (!valid) return next("/login");
  // }

  // Check auth synchornously first for speed
  if (to.path.startsWith('/admin') && !auth.isAuthenticated) {
    return next("/login");
  }

  next();
});

export default router;
