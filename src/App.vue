<script setup>
import Navbar from "./components/Navbar.vue";
</script>

<template>
  <Navbar />
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

.v-btn,
.v-card-title,
.v-list-item-title,
span {
  font-family: 'Outfit', sans-serif !important;
}
</style>