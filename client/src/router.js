import { createRouter, createWebHistory } from "vue-router";
import PublicHome from "./pages/PublicHome.vue";
import PublicArticle from "./pages/PublicArticle.vue";
import AdminDashboard from "./pages/AdminDashboard.vue";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome.vue";
import AdminProductsPage from "./pages/admin/AdminProductsPage.vue";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage.vue";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage.vue";
import AdminAffiliatesPage from "./pages/admin/AdminAffiliatesPage.vue";

const routes = [
  { path: "/", component: PublicHome },
  { path: "/article/:id", component: PublicArticle },
  {
    path: "/admin",
    component: AdminDashboard,
    children: [
      { path: "", component: AdminDashboardHome },
      { path: "products", component: AdminProductsPage },
      { path: "articles", component: AdminArticlesPage },
      { path: "categories", component: AdminCategoriesPage },
      { path: "affiliates", component: AdminAffiliatesPage },
    ],
  },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
