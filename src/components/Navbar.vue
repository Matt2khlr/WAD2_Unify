<template>
  <nav class="navbar navbar-dark navbar-expand-lg border-bottom">
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
          <li class="nav-item"><RouterLink class="nav-link" to="/settings">Profile</RouterLink></li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
.navbar-toggler {
  border: none;
}

.navbar-logo {
  width: 125px;
  height: auto;
  max-height: 100px;
}

.navbar-brand {
  display: flex;
  align-items: center;
}

nav {
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    position: sticky;
    top: 0;
    z-index: 1;
}

.navbar-nav .nav-link {
  color: white;
}

.navbar-nav .nav-link:hover {
  color: #bababa; 
}

.router-link-active {
  color: wheat !important;
}
</style>