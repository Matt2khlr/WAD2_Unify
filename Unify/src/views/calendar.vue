<template>
  <div class="calendar-app">
    <h1>Google Calendar Integration</h1>
    
    <div v-if="!isSignedIn">
      <button @click="handleAuthClick" class="auth-btn">
        Sign in with Google
      </button>
    </div>
    
    <div v-else>
      <button @click="handleSignoutClick" class="auth-btn">
        Sign Out
      </button>
      
      <div class="events-container">
        <h2>Upcoming Events</h2>
        <div v-if="events.length === 0">No upcoming events found.</div>
        <ul v-else>
          <li v-for="event in events" :key="event.id" class="event-item">
            <strong>{{ event.summary }}</strong>
            <br>
            <span>{{ formatDateTime(event.start.dateTime || event.start.date) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const CLIENT_ID = '1071880442683-199adq7lhl4k4i867qffge4gfb9ca6a8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDyg_B2fzJsgaDO8bjyyikjVeee4AM08kI';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

const isSignedIn = ref(false);
const events = ref([]);
let tokenClient;
let gapiInited = false;
let gisInited = false;

onMounted(() => {
  loadGoogleAPIs();
});

function loadGoogleAPIs() {
  // Load Google API script
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = () => {
    window.gapi.load('client', initializeGapiClient);
  };
  document.head.appendChild(gapiScript);
  
  // Load Google Identity Services script
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.onload = initializeGisClient;
  document.head.appendChild(gisScript);
}

async function initializeGapiClient() {
  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
}

function initializeGisClient() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('Auth error:', response);
        return;
      }
      isSignedIn.value = true;
      await listUpcomingEvents();
    },
  });
  gisInited = true;
}

function handleAuthClick() {
  if (!gapiInited || !gisInited) {
    alert('Google APIs not loaded yet. Please wait.');
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function handleSignoutClick() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
  isSignedIn.value = false;
  events.value = [];
}

async function listUpcomingEvents() {
  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    });
    events.value = response.result.items || [];
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

function formatDateTime(dateTimeString) {
  return new Date(dateTimeString).toLocaleString();
}
</script>

<style scoped>
.calendar-app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.auth-btn {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.auth-btn:hover {
  background-color: #357ae8;
}

.events-container {
  margin-top: 30px;
}

.event-item {
  padding: 15px;
  margin: 10px 0;
  background-color: #f5f5f5;
  border-radius: 4px;
  list-style: none;
}

ul {
  padding: 0;
}
</style>