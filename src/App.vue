<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from "./components/Navbar.vue"

const route = useRoute()

// Hide navbar on these routes
const hideNavbar = computed(() => {
  const excludedRoutes = ['/login', '/register']
  return excludedRoutes.includes(route.path)
})
</script>

<template>
  <Navbar v-if="!hideNavbar" />
  <RouterView />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Urbanist:wght@100..900&display=swap');

* {
  font-family: 'Outfit', sans-serif !important;
}

.v-application {
  font-family: 'Outfit', sans-serif !important;
}

</style>