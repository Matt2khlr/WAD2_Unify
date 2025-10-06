<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom">
    <div class="container">
      <RouterLink class="navbar-brand fw-bold" to="/">Wellbeing</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/journal">Journal</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/wellbeing">Wellbeing</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/study">Study</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/nutrition">Nutrition</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/calendar">Calendar</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/recommendations">AI Recs</RouterLink></li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
</style>
