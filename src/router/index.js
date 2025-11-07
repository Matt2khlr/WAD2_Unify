import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

// Firebase Auth
import { auth } from "@/firebase";

const routes = [
  // Main page
  { path: "/", name: "home", component: HomeView, meta: { title: "Home" } },

  // Features
  { path: "/journal", name: "journal", component: () => import("@/views/JournalView.vue"), meta: { title: "Journal" } },
  { path: "/wellbeing", name: "wellbeing", component: () => import("@/views/WellbeingView.vue"), meta: { title: "Wellbeing" } },
  { path: "/study", name: "study", component: () => import("@/views/StudyView.vue"), meta: { title: "Study" } },
  { path: "/nutrition", name: "nutrition", component: () => import("@/views/NutritionView.vue"), meta: { title: "Nutrition" } },
  { path: "/calendar", name: "calendar", component: () => import("@/views/CalendarView.vue"), meta: { title: "Calendar" } },

  // Auth/settings
  { path: "/login", name: "login", component: () => import("@/views/RegisterView.vue"), meta: { title: "Log in" } },
  { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue"), meta: { title: "Settings" } },

  // 404
  { path: "/:pathMatch(.*)*", name: "not-found", redirect: "/" }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // Return a promise to ensure scroll happens after page loads
    return new Promise((resolve) => {
      setTimeout(() => {
        if (savedPosition) {
          resolve(savedPosition);
        } else {
          resolve({ top: 0, left: 0, behavior: 'smooth' });
        }
      }, 100);
    });
  },
});

// Set document title from route meta
router.afterEach((to) => {
  const base = "Unify";
  document.title = to.meta?.title ? `${to.meta.title} • ${base}` : base;
});

// Auth guard (Firebase Auth)
const requireAuth = (to, __from, next) => {
  const stop = auth.onAuthStateChanged((user) => {
    stop();
    if (user) next();
    else next({ name: "login", query: { redirect: to.fullPath } });
  });
};

router.beforeEach((to, from, next) => {
  // Example: protect certain routes
  const protectedNames = ["home", "journal", "wellbeing", "study", "nutrition", "calendar", "settings"];

  if (protectedNames.includes(to.name)) {
    return requireAuth(to, from, next);
  }

  if (to.name === "login") {
    const stop = auth.onAuthStateChanged((user) => {
      stop();
      if (user) {
        next({ name: "home" });
      } else {
        next();
      }
    });
  }
});

export default router;
