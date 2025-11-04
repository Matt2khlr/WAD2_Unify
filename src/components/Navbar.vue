<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import Collapse from 'bootstrap/js/dist/collapse';
import { auth } from '@/firebase';
import logo from '@/assets/logo.png';

const collapseMenu = ref(null);
const userName = ref('Profile');

// Bootstrap collapse instance
let bsCollapse = null;

// Firebase auth unsubscribe
let unsubscribeAuth = null;

onMounted(() => {
    initializeCollapse();
    subscribeToAuthChanges();
    listenToProfileUpdates();
});

function initializeCollapse() {
    if (collapseMenu.value) {
        bsCollapse = new Collapse(collapseMenu.value, { toggle: false });
    }
}

function subscribeToAuthChanges() {
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            userName.value = user.displayName || 'Profile';
        } else {
            userName.value = 'Profile';
        }
    });
}

function listenToProfileUpdates() {
    window.addEventListener('profile-updated', handleProfileUpdate);
}

function handleProfileUpdate() {
    userName.value = auth.currentUser?.displayName || 'Profile';
}

onBeforeUnmount(() => {
    cleanupCollapse();
    cleanupAuthListener();
});

function cleanupCollapse() {
    if (bsCollapse) {
        bsCollapse.dispose();
        bsCollapse = null;
    }
}

function cleanupAuthListener() {
    if (unsubscribeAuth) {
        unsubscribeAuth();
        unsubscribeAuth = null;
    }

    window.removeEventListener('profile-updated', handleProfileUpdate);
}

function closeNav() {
    if (bsCollapse && collapseMenu.value?.classList.contains('show')) {
        bsCollapse.hide();
    }
}
</script>

<template>
    <nav class="navbar navbar-dark navbar-expand-lg">
        <div class="container">
            <RouterLink class="navbar-brand d-flex align-items-center" to="/" @click="closeNav">
                <img :src="logo" class="navbar-logo" alt="Logo" />
            </RouterLink>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div id="mainNav" ref="collapseMenu" class="collapse navbar-collapse">
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
                        <RouterLink class="nav-link user-name" to="/settings" @click="closeNav">{{ userName }}
                        </RouterLink>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</template>

<style scoped>
nav {
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    position: sticky;
    top: 0;
    z-index: 100;
}

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

.navbar-nav .nav-link {
    color: white;
    transition: color 0.2s ease;
}

.navbar-nav .nav-link:hover {
    color: #bababa;
}

.router-link-active {
    color: wheat !important;
}

.user-name {
    background: linear-gradient(120deg, #ffd700 0%, #ffed4e 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: bold;
    display: inline-block;
    transition: all 0.2s ease;
}

.user-name:hover {
    background: linear-gradient(120deg, #ffed4e 0%, #ffd700 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
</style>