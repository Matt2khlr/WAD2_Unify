<script setup>
import { ref, computed, onMounted } from 'vue';
import WordCloud from 'wordcloud';
import { db, auth } from '../firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

const sleepData = ref([
  { day: "Mon", hours: 7 },
  { day: "Tue", hours: 6.5 },
  { day: "Wed", hours: 8 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 6 },
  { day: "Sat", hours: 9 },
  { day: "Sun", hours: 8.5 },
]);

const moodOptions = [
  { label: "Great", color: "bg-success", icon: "😊" },
  { label: "Okay", color: "bg-warning", icon: "😐" },
  { label: "Stressed", color: "bg-danger", icon: "☹️" },
];

const selectedMood = ref(null);
const stressLevel = ref(40);

// Compute average sleep directly from sleepData
const averageSleep = computed(() => {
  const total = sleepData.value.reduce((sum, d) => sum + d.hours, 0);
  return (total / sleepData.value.length).toFixed(1);
});

function selectMood(label) {
  selectedMood.value = label;
}

function updateStress() {
  alert(`Stress level updated to ${stressLevel.value}`);
}

// Allow user to edit sleep for a given day
function editSleep(dayObj) {
  const current = dayObj.hours;
  let newVal = window.prompt(`Enter sleep hours for ${dayObj.day}:`, current);
  if (newVal !== null) {
    newVal = parseFloat(newVal);
    if (!isNaN(newVal) && newVal >= 0 && newVal <= 24) {
      dayObj.hours = newVal;
    }
  }
}

async function logSleep() {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to log sleep.');
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
  alert('Sleep data logged!');
}

async function logMood() {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to log mood.');
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
  alert('Stress Level logged!');
}

async function fetchLatestSleepLog() {
  const user = auth.currentUser;
  if (!user) return;
  const sleepLogQuery = query(
    collection(db, "sleepLogs"),
    where("userId", "==", user.uid),             
    orderBy("date", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(sleepLogQuery);
  if (!querySnapshot.empty) {
    const latestLog = querySnapshot.docs[0].data();
    if (latestLog.sleepData) {
      sleepData.value = latestLog.sleepData;
    }
  }
}

const stressLabel = computed(() => {
  if (stressLevel.value < 30) return 'Low';
  if (stressLevel.value < 70) return 'Moderate';
  return 'High';
});

const stressColorClass = computed(() => {
  if (stressLevel.value < 30) return 'text-success';  // Green
  if (stressLevel.value < 70) return 'text-warning';  // Yellow-ish for Moderate
  return 'text-danger';  // Red
});

const selectedFactors = ref([]);

// Toggle selection of a stress factor
function toggleFactor(factor) {
  const idx = selectedFactors.value.indexOf(factor);
  if (idx === -1) {
    selectedFactors.value.push(factor);
  } else {
    selectedFactors.value.splice(idx, 1);
  }
}

// Stress factors and values for word cloud
const stressFactors = [
  ['Deadlines', 12],
  ['Homework', 9],
  ['Exams', 15],
  ['Sleep', 7],
  ['Lack of support', 6],
  ['Social', 8],
  ['Fear of future', 10],
  ['Health', 5],
  ['Environment', 4]
];

const canvasRef = ref(null);

onMounted(() => {
  fetchLatestSleepLog();
  const canvas = canvasRef.value;
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Set canvas buffer size with DPR scaling
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale drawing context for crispness
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  WordCloud(canvas, {
    list: stressFactors,
    gridSize: 5,
    weightFactor: 10,
    minFontSize: 8,
    maxFontSize:30,
    fontFamily: 'Arial, sans-serif',
    color: 'random-dark',
    rotateRatio: 0.1,
    ellipticity: 0.8,
    backgroundColor: '#f0f0f0',
    origin: [rect.width / 2, rect.height / 2], // Use rect width/height for origin coords
  });
});


</script>

<template>
  <div class="min-vh-100 bg-light py-5">
    <div class="container">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="d-flex align-items-center gap-3 mb-2">
          <!--<span class="text-danger fs-1">❤️</span>-->
          Wellness Tracker
        </h1>
        <p class="text-muted">Monitor your mental health and sleep patterns</p>
      </div>


      <div class="row mb-4 g-4">
        <!-- Sleep Tracker -->
        <div class="col-12 col-lg-6">
          <div class="card shadow p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h3 class="d-flex align-items-center gap-2 mb-0">
                <!--<span class="fs-5 text-info">🌙</span>-->
                Sleep Tracking
              </h3>
            </div>
            <div class="mb-3">
              <p class="mb-1 text-secondary small">Average this week</p>
              <p class="fs-2 fw-bold text-info">{{ averageSleep }} hrs</p>
            </div>

            <!-- Interactive Sleep Tracker -->
            <div class="mb-3">
              <div 
                v-for="day in sleepData" 
                :key="day.day" 
                class="d-flex align-items-center gap-3 mb-2"
              >
                <div class="fw-medium" style="width: 50px;">
                  {{ day.day }}
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="0.5"
                  v-model.number="day.hours"
                  class="flex-grow-1"
                  style="max-width: 400px;"
                  :aria-label="`Sleep hours for ${day.day}`"
                />
                <div class="text-secondary" style="width: 45px;">{{ day.hours }}h</div>
              </div>
            </div>
            <button class="btn btn-info w-100 mt-3" @click="logSleep">Log Sleep</button>
          </div>
        </div>

        <!-- Stress Level -->
        <div class="col-12 col-lg-6">
          <div class="card shadow p-4 h-100 d-flex flex-column">
            <h3 class="mb-3 d-flex align-items-center gap-2">
              <!--<span class="fs-5 text-warning">✨</span>-->
              Current Stress Level
            </h3>
            <div class="mb-3">
              <div class="d-flex justify-content-between small text-muted mb-2">
                <div>Low</div>
                <div>High</div>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="1" 
                v-model="stressLevel"
                class="form-range"
                aria-label="Stress level slider"
              />
              <p :class="['text-center', 'fs-3', 'fw-bold', stressColorClass, 'mb-0']">{{ stressLabel }}</p>
            </div>
            <div class="bg-light rounded p-3 mb-3 flex-grow-1">
              <h4 class="fw-semibold mb-2">Stress Factors Today:</h4>
              <div class="d-flex flex-wrap gap-2">
              <span
                v-for="([factor]) in stressFactors"
                :key="factor"
                @click="toggleFactor(factor)"
                :class="[
                  'badge',
                  'badge-custom',
                  selectedFactors.includes(factor) ? 'bg-danger' : '',
                  'fw-semibold'
                ]"
                style="user-select: none;"
              >
                {{ factor }}
              </span>
              </div>
            </div>
            <button class="btn btn-secondary w-100" @click="[updateStress(), logMood()]" >Update Stress Level</button>
          </div>
        </div>
      </div>

      <!-- Wellness Tips -->
      <div class="card shadow p-4 bg-gradient rounded">
        <h3 class="mb-4"><!--🧘 -->Wellness Recommendations</h3>
        <div class="row g-4">
          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded shadow-sm">
              <h5 class="fw-medium mb-2">Better Sleep Hygiene</h5>
              <p class="text-muted mb-0">Aim for 7-9 hours of sleep. Keep a consistent sleep schedule.</p>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded shadow-sm">
              <h5 class="fw-medium mb-2">Manage Stress</h5>
              <p class="text-muted mb-0">Try meditation, deep breathing, or short walks between study sessions.</p>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded shadow-sm">
              <h5 class="fw-medium mb-2">Stay Social</h5>
              <p class="text-muted mb-0">Connect with friends and family regularly for emotional support.</p>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded shadow-sm">
              <h5 class="fw-medium mb-2">Take Breaks</h5>
              <p class="text-muted mb-0">Regular breaks improve focus and reduce mental fatigue.</p>
            </div>
          </div>
          <div class="card shadow p-4 mt-4">
            <h3 class="mb-3">Common Stress Factors this week</h3>
          <canvas ref="canvasRef" width="600" height="300" style="width: 100%; height: 600px;"></canvas>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>