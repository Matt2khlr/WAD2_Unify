<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import Collapse from 'bootstrap/js/dist/collapse';
import { auth } from '@/firebase';
import logo from '@/assets/logo.png';

const collapseMenu = ref(null);
const userName = ref('Profile');
const isOpen = ref(false);

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

function toggleNav() {
  bsCollapse?.toggle();
  requestAnimationFrame(() => { isOpen.value = collapseMenu.value?.classList.contains('show'); });
}

function closeNav() {
  bsCollapse?.hide();
  isOpen.value = false;
}
</script>

<template>
  <nav class="navbar navbar-dark navbar-expand-lg">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center" to="/" @click="closeNav">
        <img :src="logo" class="navbar-logo" alt="Logo" />
      </RouterLink>

      <button class="navbar-toggler" type="button" aria-controls="mainNav" :aria-expanded="isOpen"
        aria-label="Toggle navigation" @click="toggleNav">
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
            <RouterLink class="nav-link username-pill" to="/settings" @click="closeNav">
              <i class="mdi mdi-account me-2"></i>{{ userName }}&nbsp;
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
  z-index: 1000;
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

.username-pill {
  background: white;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text !important;
  border: 1px solid white;
  border-radius: 20px;
  font-weight: bold;
  display: inline-block;
  transition: all 0.3s ease !important;
  padding: 0.5rem 1rem;
}

.username-pill:hover {
  background: #fff !important;
  -webkit-background-clip: unset !important;
  -webkit-text-fill-color: unset !important;
  background-clip: unset !important;
  color: #667eea !important;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
}


.username-pill.router-link-active {
  background: wheat;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text !important;
  border: 1px solid wheat;
  border-radius: 20px;
  font-weight: bold;
  transition: all 0.3s ease !important;
}

.username-pill.router-link-active:hover {
  background: wheat !important;
  color: #667eea !important;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  -webkit-background-clip: unset !important;
  -webkit-text-fill-color: unset !important;
  background-clip: unset !important;
}
</style>