<script setup>
import { ref, computed } from 'vue';

// Status (add functionality)
const currentStatus = ref({
    stress: 'Moderate',
    freeTime: '3 hours',
    upcomingDeadlines: 4,
    sleepQuality: 'Good'
});

// Suggestions (add functionality)
const suggestions = ref([
    {
        title: 'Take a Break',
        description: "You've been working for 2 hours. Take a 15-minute break to refresh your mind.",
        time: 'In 10 mins',
        priority: 'high',
        type: 'break'
    },
    {
        title: 'Focus Study Session',
        description: 'Start a 50-minute Pomodoro session on Web Development. You have an assignment due this Friday.',
        time: '3:00 PM',
        priority: 'medium',
        type: 'study'
    },
    {
        title: 'Quick Workout',
        description: 'You have 1 hour of free time at 5 PM. Go for a gym session or home workout to keep up with exercise.',
        time: '5:00 PM',
        priority: 'medium',
        type: 'exercise'
    },
    {
        title: 'Wind Down Routine',
        description: 'Your sleep quality is good! Maintain it by starting your bedtime routine at 10 PM.',
        time: '10:00 PM',
        priority: 'low',
        type: 'sleep'
    }
]);

// Status list
const statusList = computed(() => [
    { key: 'stress', label: 'Stress Level', value: currentStatus.value.stress },
    { key: 'freeTime', label: 'Free Time Today', value: currentStatus.value.freeTime },
    { key: 'deadlines', label: 'Deadlines (7 days)', value: currentStatus.value.upcomingDeadlines },
    { key: 'sleep', label: 'Sleep Quality', value: currentStatus.value.sleepQuality }
]);

// For status cards
const priorityClasses = {
    high: { badge: 'bg-danger text-white', border: 'border-danger' },
    medium: { badge: 'bg-warning text-dark', border: 'border-warning' },
    low: { badge: 'bg-success', border: 'border-success' },
    default: { badge: 'bg-light text-dark', border: 'border-light' }
};

// Icons
// const icons = {
//     study: '📘',
//     break: '☕',
//     exercise: '🏋️',
//     sleep: '🌙',
//     default: '✨'
// };

function getPriorityClass(suggestion) {
    const priorityClass = priorityClasses[suggestion.priority] || priorityClasses.default;
    return { border: priorityClass.border, badge: priorityClass.badge };
}

// function iconForType(type) {
//     return icons[type] || icons.default;
// }
</script>

<template>
    <div class="container py-4">
        <!-- Header -->
        <h2>Your personalised recommendations</h2>
        <p class="text-muted">
            Suggestions tailored to your current schedule and wellbeing
        </p>

        <!-- Status cards -->
        <div class="row g-3 mb-4">
            <div class="col-6 col-md-3" v-for="status in statusList" :key="status.key">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="small text-muted">{{ status.label }}</div>
                        <div class="fs-5 fw-semibold mt-1">{{ status.value }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Suggestions list -->
        <div class="row g-3">
            <div class="col-12 col-md-6 col-lg-4" v-for="suggestion in suggestions" :key="suggestion.title">
                <div class="card h-100 border-2" :class="getPriorityClass(suggestion).border">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-2">
                            <!-- <div class="me-2 fs-5">{{ iconForType(suggestion.type) }}</div> -->
                            <h6 class="mb-0">{{ suggestion.title }}</h6>
                            <span class="badge ms-auto" :class="getPriorityClass(suggestion).badge">{{ suggestion.priority }}</span>
                        </div>
                        <p class="mb-2 text-secondary">{{ suggestion.description }}</p>
                        <div class="d-flex align-items-center">
                            <!-- <span class="me-2">⏰</span> -->
                            <small class="text-muted">{{ suggestion.time }}</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Description of methodology -->
        <div class="mt-4">
            <div class="card">
                <div class="card-body">
                    <h6>Methodology of recommendations</h6>
                    <p class="mb-2">
                        These suggestions adapt to your schedule, stress, and daily wellness patterns to help you stay
                        balanced and productive.
                    </p>
                    <ul class="mb-0">
                        <li>Thoughtful suggestions that balance work and play</li>
                        <li>Updates dynamically as schedule and wellbeing change</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Cards */
.card {
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

/* Badge text */
.badge {
    text-transform: capitalize;
}

p {
    color: black !important;
}
</style>