<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Collapse from 'bootstrap/js/dist/collapse'

const collapseMenu = ref(null);
let bsCollapse = null;

onMounted(() => {
    if (collapseMenu.value) {
        bsCollapse = new Collapse(collapseMenu.value, { toggle: false });
    }
})

onBeforeUnmount(() => {
    if (bsCollapse) {
        bsCollapse.dispose();
    }
})

function closeNav() {
    if (bsCollapse && collapseMenu.value.classList.contains('show')) {
        bsCollapse.hide();
    }
}
</script>

<template>
    <nav class="navbar navbar-dark navbar-expand-lg">
        <div class="container">
            <RouterLink class="navbar-brand d-flex align-items-center" to="/" @click="closeNav">
                <img src="../assets/logo.png" class="navbar-logo" alt="Logo" />
            </RouterLink>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div id="mainNav" class="collapse navbar-collapse" ref="collapseMenu">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/journal" @click="closeNav">Journal</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/wellbeing" @click="closeNav">Wellbeing</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/study" @click="closeNav">Study</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/nutrition" @click="closeNav">Nutrition</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/calendar" @click="closeNav">Calendar</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/settings" @click="closeNav">Profile</RouterLink>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</template>

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
    z-index: 100;
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