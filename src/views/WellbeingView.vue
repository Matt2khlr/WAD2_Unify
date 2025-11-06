<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import WordCloud from 'wordcloud';
import { collection, where, addDoc, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from '@/firebase';

// Default sleep data
const sleepData = ref([
  { day: "Mon", hours: 7 },
  { day: "Tue", hours: 7 },
  { day: "Wed", hours: 7 },
  { day: "Thu", hours: 7 },
  { day: "Fri", hours: 7 },
  { day: "Sat", hours: 7 },
  { day: "Sun", hours: 7 },
]);

const stressLevel = ref(40);

// Default stress factors
const stressFactors = [
  ['Deadlines', 0],
  ['Homework', 0],
  ['Exams', 0],
  ['Sleep', 0],
  ['Lack of support', 0],
  ['Social', 0],
  ['Fear of future', 0],
  ['Health', 0],
  ['Environment', 0]
];

const canvasRef = ref(null);
const fetchedFactors = ref([]);

const averageSleep = computed(() => {
  const total = sleepData.value.reduce((sum, d) => sum + d.hours, 0);
  return (total / sleepData.value.length).toFixed(1);
});

const toastMessage = ref('');
const toastRef = ref(null);

function showToast(message) {
  toastMessage.value = message;
  const el = toastRef.value;
  if (!el) return;

  const t = bootstrap.Toast.getOrCreateInstance(el);
  t.show();

  setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
}

function resetStressInputs() {
  stressLevel.value = 40;
  selectedFactors.value = [];
}

// Log sleep 
async function logSleep() {
  const user = auth.currentUser;
  if (!user) {
    showToast('You must be logged in to log sleep.');
    return;
  }
  await addDoc(
    collection(db, "sleepLogs"),
    {
      userId: user.uid,
      sleepData: sleepData.value,
      date: new Date().toISOString()
    }
  );
  showToast('Sleep data logged!');
}

// Log mood
async function logMood() {
  const user = auth.currentUser;
  if (!user) {
    showToast('You must be logged in to log mood.');
    return;
  }
  await addDoc(
    collection(db, "moodLogs"),
    {
      userId: user.uid,
      mood: stressLevel.value,
      stressFactors: selectedFactors.value,
      date: new Date().toISOString()
    }
  );
  showToast(`Stress level updated to ${stressLevel.value}, stress factors logged.`);
  resetStressInputs();
}

// Fetch latest sleep 
async function fetchLatestSleepLog() {
  const user = auth.currentUser;
  if (!user) return;
  const sleepQuery = query(
    collection(db, "sleepLogs"),
    where("userId", "==", user.uid),
    orderBy("date", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(sleepQuery);
  if (!snapshot.empty) {
    const latest = snapshot.docs[0].data();
    if (latest.sleepData) {
      sleepData.value = latest.sleepData;
      console.log("Fetched latest sleep:", latest.sleepData);
    }
  }
}

// Listener
function subscribeToStressFactorsRealtime(userId) {
  const q = query(
    collection(db, "moodLogs"),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(7)
  );
  return onSnapshot(q, (querySnapshot) => {
    const factorCount = {};
    querySnapshot.forEach(doc => {
      const log = doc.data();
      if (Array.isArray(log.stressFactors)) {
        log.stressFactors.forEach(factor => {
          factorCount[factor] = (factorCount[factor] || 0) + 1;
        });
      }
    });
    fetchedFactors.value = Object.entries(factorCount);
  });
}

const stressLabel = computed(() => {
  if (stressLevel.value < 30) return 'Low';
  if (stressLevel.value < 70) return 'Moderate';
  return 'High';
});

const stressColorClass = computed(() => {
  if (stressLevel.value < 30) return 'text-success';
  if (stressLevel.value < 70) return 'text-warning';
  return 'text-danger';
});

const selectedFactors = ref([]);

function toggleFactor(factor) {
  const idx = selectedFactors.value.indexOf(factor);
  if (idx === -1) {
    selectedFactors.value.push(factor);
  } else {
    selectedFactors.value.splice(idx, 1);
  }
}

// Draws the word cloud
function drawWordCloud(factors) {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const isMobile = window.innerWidth < 576;

  WordCloud(canvas, {
    list: factors.length ? factors : stressFactors,
    gridSize: isMobile ? 2 : Math.max(3, Math.floor(window.innerWidth / 150)),
    weightFactor: isMobile ? 10 : 15,
    minFontSize: isMobile ? 10 : 10,
    maxFontSize: isMobile ? 18 : 30,
    fontFamily: 'Arial, sans-serif',
    color: 'random-dark',
    rotateRatio: 0.1,
    ellipticity: 0.8,
    backgroundColor: '#f0f0f0',
    origin: [
      canvas.width / 2 / (window.devicePixelRatio || 1),
      canvas.height / 2 / (window.devicePixelRatio || 1)
    ],
  });
}

function initializeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = Math.max(rect.height, window.innerWidth < 576 ? 300 : 400);

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Redraw word cloud after resize
  drawWordCloud(fetchedFactors.value);
}

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await fetchLatestSleepLog();

      subscribeToStressFactorsRealtime(user.uid);
    }
  });

  initializeCanvas();
  window.addEventListener('resize', initializeCanvas);
});


watch(fetchedFactors, (newFactors) => {
  drawWordCloud(newFactors);
}, { immediate: true, deep: true });
</script>

<template>
  <div class="min-vh-100 py-4 py-md-5">
    <div class="container">
      <!-- Toast -->
      <div v-show="toastMessage" ref="toastRef" class="toast-custom" role="alert"
        aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
        <div class="toast-body">
          {{ toastMessage }}
        </div>
      </div>

      <div class="mb-4 mb-md-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          Wellbeing Tracker
        </h1>
        <p class="text-muted fs-5">Monitor your sleep and mental health.</p>
      </div>

      <div class="row mb-4 g-4">
        <!-- Sleep -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-soft h-100">
            <div class="card-header">
              Sleep Tracking
            </div>
            <div class="card-body p-4">
              <p class="mb-1 text-secondary small">Average this week</p>
              <p class="fs-2 fw-bold text-info">{{ averageSleep }} hrs</p>

              <div class="mb-3">
                <div v-for="day in sleepData" :key="day.day" class="d-flex align-items-center gap-3 mb-2">
                  <div class="fw-medium" style="width: 50px;">
                    {{ day.day }}
                  </div>
                  <input type="range" min="0" max="14" step="0.5" v-model.number="day.hours" class="flex-grow-1"
                    style="max-width: 400px;" :aria-label="`Sleep hours for ${day.day}`" />
                  <div class="text-secondary" style="width: 45px;">{{ day.hours }}h</div>
                </div>
              </div>
              <button class="btn w-100 mt-3" @click="logSleep">Log Sleep</button>
            </div>
          </div>
        </div>

        <!-- Stress Level -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-soft h-100 d-flex flex-column">
            <div class="card-header">
              Current Stress Level
            </div>
            <div class="card-body p-4 flex-grow-1 d-flex flex-column">
              <div class="mb-3">
                <div class="d-flex justify-content-between small text-muted mb-2">
                  <div>Low</div>
                  <div>High</div>
                </div>
                <input type="range" min="0" max="100" step="1" v-model="stressLevel" class="form-range"
                  aria-label="Stress level slider" />
                <p :class="['text-center', 'fs-3', 'fw-bold', stressColorClass, 'mb-0']">{{ stressLabel }}</p>
              </div>
              <div class="rounded p-3 mb-3 flex-grow-1 bg-light">
                <h4 class="fw-semibold mb-2">Stress Factors Today:</h4>
                <div class="d-flex flex-wrap gap-2">
                  <span v-for="([factor]) in stressFactors" :key="factor" @click="toggleFactor(factor)" :class="[
                    'badge',
                    'badge-custom',
                    selectedFactors.includes(factor) ? 'bg-danger' : '',
                    'fw-semibold'
                  ]" style="user-select: none;">
                    {{ factor }}
                  </span>
                </div>
              </div>
              <button class="btn w-100" @click="[logMood()]">Update Stress Level</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-gradient">
        <div class="card-header">
          Common Stress Factors
        </div>
        <div class="card-body p-4">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

canvas {
  width: 100%;
  height: auto;
  min-height: 300px;
  display: block;
}

.btn {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 0.5rem 1.5rem;
}

.btn:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(118, 75, 162, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.card {
  border: none;
  border-radius: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  background-color: #f5f5f5;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.card-header {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  font-weight: 600;
  font-size: 1.3rem;
}

.card-body {
  padding: 1.5rem;
  background: white;
}

.shadow-soft {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.badge-custom {
  background-color: #6c757d;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.badge-custom:hover {
  background-color: blue;
  color: white;
}

.toast-custom {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.25rem; 
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  min-width: 300px;
  max-width: 90vw;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: opacity, transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 576px) {
  .toast-custom {
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    transform: none;
    min-width: unset;
    max-width: 100%;
    width: calc(100% - 1rem);
    border-radius: 6px;
    padding: 0.6rem 1rem;
  }
}

@media (min-width: 768px) {
  .toast-custom {
    min-width: 350px;
  }
}

@media (min-width: 576px) {
  canvas {
    min-height: 400px;
  }
}

@media (min-width: 992px) {
  canvas {
    min-height: 500px;
  }
}
</style>