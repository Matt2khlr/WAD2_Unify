// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
// Eager-load Home so the first paint is instant
import HomeView from "../views/HomeView.vue";

// If you plan to use Firebase Auth later, you can import it here:
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "@/firebase";

const routes = [
  { path: "/", name: "home", component: HomeView, meta: { title: "Home" } },

  { path: "/journal", name: "journal", component: () => import("@/views/JournalView.vue"), meta: { title: "Journal" } },
  { path: "/wellbeing", name: "wellbeing", component: () => import("@/views/WellbeingView.vue"), meta: { title: "Wellbeing" } },
  { path: "/study", name: "study", component: () => import("@/views/StudyView.vue"), meta: { title: "Study" } },
  { path: "/nutrition", name: "nutrition", component: () => import("@/views/NutritionView.vue"), meta: { title: "Nutrition" } },
  { path: "/calendar", name: "calendar", component: () => import("@/views/CalendarView.vue"), meta: { title: "Calendar" } },

  // Old paths
  { path: "/recommendations", name: "recommendations", component: () => import("@/views/RecommendationsView.vue"), meta: { title: "Recommendations" } },

  // Optional auth/settings
  { path: "/login", name: "login", component: () => import("@/views/RegisterView.vue"), meta: { title: "Log in" } },
  { path: "/register", name: "register", component: () => import("@/views/RegisterView.vue"), meta: { title: "Register" } },
  { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue"), meta: { title: "Settings" } },

  // 404
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue"), meta: { title: "Not Found" } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// Optional: set document title from route meta
router.afterEach((to) => {
  const base = "Unify";
  document.title = to.meta?.title ? `${to.meta.title} • ${base}` : base;
});

/* Optional auth guard template (uncomment when you have Firebase Auth)
const requireAuth = (to, from, next) => {
  const stop = auth.onAuthStateChanged((user) => {
    stop();
    if (user) next();
    else next({ name: "login", query: { redirect: to.fullPath } });
  });
};

router.beforeEach((to, from, next) => {
  // Example: protect certain routes
  const protectedNames = ["journal","wellbeing","study","nutrition","calendar","recommendations","settings"];
  if (protectedNames.includes(to.name)) return requireAuth(to, from, next);
  next();
});
*/

export default router;
