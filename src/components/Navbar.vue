<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center" to="/">
        <img src="../assets/logo.png" class="navbar-logo" alt="Logo" />
      </RouterLink>

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
          <!-- <li class="nav-item"><RouterLink class="nav-link" to="/recommendations">Recommendations</RouterLink></li> -->
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
.navbar-logo {
  width: 50px; /* Adjust the size of the logo */
  height: auto; /* Maintain aspect ratio */
  max-height: 100px; /* Set a max height to keep it from getting too large */
}

.navbar-brand {
  display: flex;
  align-items: center; /* Vertically align logo with any text */
}
</style>