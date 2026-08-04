import { createRouter, createWebHistory } from "vue-router";
// Solo la portada va en el bundle inicial: es la entrada más habitual y así pinta sin
// esperar a un segundo fichero. El resto se carga por ruta con import() dinámico. El motivo
// de fondo: el admin arrastra TipTap/ProseMirror (el editor de artículos), cientos de KB
// que ningún visitante público debería descargar. Antes del split, el bundle único de
// ~683 KB era el causante de los 2.250 ms de retraso de renderizado del LCP en móvil.
import PublicHome from "./pages/PublicHome.vue";
const PublicArticle = () => import("./pages/PublicArticle.vue");
const PublicCategories = () => import("./pages/PublicCategories.vue");
const PublicCategory = () => import("./pages/PublicCategory.vue");
const PublicSearch = () => import("./pages/PublicSearch.vue");
const AdminDashboard = () => import("./pages/AdminDashboard.vue");
const AdminDashboardHome = () => import("./pages/admin/AdminDashboardHome.vue");
const AdminAnalyticsPage = () => import("./pages/admin/AdminAnalyticsPage.vue");
const AdminProductsPage = () => import("./pages/admin/AdminProductsPage.vue");
const AdminArticlesPage = () => import("./pages/admin/AdminArticlesPage.vue");
const AdminCategoriesPage = () => import("./pages/admin/AdminCategoriesPage.vue");
const AdminNewsletterPage = () => import("./pages/admin/AdminNewsletterPage.vue");
const LegalPage = () => import("./pages/LegalPage.vue");
const NotFoundPage = () => import("./pages/NotFoundPage.vue");
const LoginPage = () => import("./pages/LoginPage.vue");
import { useAuthStore } from "./stores/auth.js";
import { trackEvent } from "./track.js";

// OJO: al añadir una ruta pública aquí hay que añadirla también a los rewrites de
// vercel.json apuntando a /index.html. Lo que no está enumerado allí cae en el catch-all,
// que ahora responde 404 de verdad en lugar de servir la portada.
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
      { path: "analytics", component: AdminAnalyticsPage },
      { path: "products", component: AdminProductsPage },
      { path: "articles", component: AdminArticlesPage },
      { path: "categories", component: AdminCategoriesPage },
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

router.afterEach((to) => {
  // Las páginas de artículo registran su propia vista (con el id del artículo).
  if (to.path.startsWith("/admin") || to.path.startsWith("/login") || to.path.startsWith("/analisis/")) return;
  trackEvent({ type: "view", path: to.path, referrer: document.referrer || null });
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
