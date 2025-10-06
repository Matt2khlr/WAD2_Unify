<script setup>
import { ref } from 'vue';

const sleepData = [
  { day: "Mon", hours: 7 },
  { day: "Tue", hours: 6.5 },
  { day: "Wed", hours: 8 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 6 },
  { day: "Sat", hours: 9 },
  { day: "Sun", hours: 8.5 },
];

const moodOptions = [
  { label: "Great", color: "bg-success", icon: "😊" },
  { label: "Okay", color: "bg-warning", icon: "😐" },
  { label: "Stressed", color: "bg-danger", icon: "☹️" },
];

const selectedMood = ref(null);
const stressLevel = ref(40);

function selectMood(label) {
  selectedMood.value = label;
}

function updateStress() {
  alert(`Stress level updated to ${stressLevel.value}`);
}
</script>

<template>
    <div class="min-vh-100 bg-light py-5">
        <div class="container">
            <div class="mb-4">
                <h1 class="d-flex align-items-center gap-3 mb-2">
                    <span class="text-danger fs-1">❤️</span>
                    Wellness Tracker
                </h1>
                <p class="text-muted">Monitor your mental health and sleep patterns</p>
            </div>

<!-- Mental Health Check-in -->
            <div class="card bg-primary text-white shadow mb-4 p-4">
                <h2 class="mb-4">How are you feeling today?</h2>
                    <div class="d-flex justify-content-center gap-4 mb-3">
                        <button 
                        v-for="option in moodOptions" 
                        :key="option.label" 
                        :class="['d-flex flex-column align-items-center p-3 rounded', option.color, { 'opacity-75': selectedMood !== option.label }]"
                        style="width: 100px; transition: transform 0.3s;"
                        @click="selectMood(option.label)"
                        :style="{ transform: selectedMood === option.label ? 'scale(1.05)' : 'scale(1)' }"
                        >
                            <span class="fs-1">{{ option.icon }}</span>
                            <span class="mt-2 fw-semibold">{{ option.label }}</span>
                        </button>
                    </div>
                    <p class="text-center text-white-75">Track your mood daily to identify patterns and improve wellbeing</p>
                </div>

            <div class="row mb-4 g-4">
<!-- Sleep Tracker -->
                <div class="col-12 col-lg-6">
                     <div class="card shadow p-4 h-100">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <h3 class="d-flex align-items-center gap-2 mb-0">
                            <span class="fs-5 text-info">🌙</span>
                            Sleep Tracking
                            </h3>
                        </div>
                    <div class="mb-3">
                        <p class="mb-1 text-secondary small">Average this week</p>
                        <p class="fs-2 fw-bold text-info">7.5 hrs</p>
                    </div>

                    <div class="mb-3">
                        <div v-for="day in sleepData" :key="day.day" class="d-flex align-items-center gap-3 mb-2">
                            <div class="fw-medium" style="width: 50px;">{{ day.day }}</div>
                                <div class="progress flex-grow-1" style="height: 20px;">
                                    <div 
                                    class="progress-bar bg-info" 
                                    role="progressbar" 
                                    :style="{width: (day.hours / 10 * 100) + '%'}"
                                    :aria-valuenow="day.hours"
                                    aria-valuemin="0" 
                                    aria-valuemax="10"
                                    >
                                    </div>
                                </div>
                                <div class="text-secondary" style="width: 45px;">{{ day.hours }}h</div>
                            </div>
                        </div>

                        <button class="btn btn-info w-100 mt-3">Log Sleep</button>
                    </div>
                </div>

<!-- Stress Level -->
                <div class="col-12 col-lg-6">
                    <div class="card shadow p-4 h-100 d-flex flex-column">
                        <h3 class="mb-3 d-flex align-items-center gap-2">
                        <span class="fs-5 text-warning">✨</span>
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
                        <p class="text-center fs-3 fw-bold text-warning mb-0">Moderate</p>
                    </div>

    <div class="bg-light rounded p-3 mb-3 flex-grow-1">
        <h4 class="fw-semibold mb-2">Stress Factors Today:</h4>
        <div class="d-flex flex-wrap gap-2">
        <span v-for="factor in ['Deadlines', 'Exams', 'Sleep', 'Social']" :key="factor" class="badge bg-secondary">
            {{ factor }}
        </span>
        </div>
    </div>

    <button class="btn btn-secondary w-100" @click="updateStress">Update Stress Level</button>
    </div>
</div>
</div>

<!-- Wellness Tips -->
<div class="card shadow p-4 bg-gradient rounded">
<h3 class="mb-4">🧘 Wellness Recommendations</h3>
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
</div>
</div>

</div>
</div>
</template>
