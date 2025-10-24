<script setup>
import { BookOpen, Heart, Dumbbell, CheckCircle2, Clock, TrendingUp } from "lucide-vue-next";
import { ref, computed } from 'vue';

const tasks = [
    { title: "Complete Data Structures Assignment", time: "Due: 6 PM", completed: false },
    { title: "Review Calculus Notes", time: "30 mins", completed: true },
    { title: "Pomodoro Session: Physics", time: "25 mins", completed: true },
    { title: "Evening Workout", time: "5 PM", completed: false },
];

const modules = [
    { name: "Data Structures", progress: 75 },
    { name: "Calculus II", progress: 60 },
    { name: "Physics", progress: 45 },
    { name: "Web Development", progress: 90 },
];

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
const icons = {
    study: '📘',
    break: '☕',
    exercise: '🏋️',
    sleep: '🌙',
    default: '✨'
};

function getPriorityClass(suggestion) {
    const priorityClass = priorityClasses[suggestion.priority] || priorityClasses.default;
    return { border: priorityClass.border, badge: priorityClass.badge };
}

function iconForType(type) {
    return icons[type] || icons.default;
}
</script>

<template>
    <div class="min-vh-100 bg-light">
        <header class="bg-white border-bottom">
            <div class="container px-4 py-5">
                <h1 class="display-6 fw-bold mb-2">Welcome back! 👋</h1>
                <p class="fs-5 text-muted mb-0">
                    Your hub for academic success & wellbeing. Let's make today productive and balanced.
                </p>
            </div>
        </header>

        <!-- Recommendation section -->
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
                                <div class="me-2 fs-5">{{ iconForType(suggestion.type) }}</div>
                                <h6 class="mb-0">{{ suggestion.title }}</h6>
                                <span class="badge ms-auto" :class="getPriorityClass(suggestion).badge">{{
                                    suggestion.priority }}</span>
                            </div>
                            <p class="mb-2 text-secondary">{{ suggestion.description }}</p>
                            <div class="d-flex align-items-center">
                                <span class="me-2">⏰</span>
                                <small class="text-muted">{{ suggestion.time }}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Dashboard section -->
        <div class="container px-4 py-3">
            <div class="row g-4 mb-4">
                <div class="col-12 col-md-4">
                    <div class="card stat-card gradient-primary shadow-soft h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="icon-wrap me-3">
                                <BookOpen :size="24" />
                            </div>
                            <div>
                                <div class="text-uppercase small fw-semibold opacity-75">Study Sessions Today</div>
                                <div class="h3 mb-0">3</div>
                                <div class="small opacity-75">2 hours focused time</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-md-4">
                    <div class="card stat-card gradient-wellness shadow-soft h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="icon-wrap me-3">
                                <Heart :size="24" />
                            </div>
                            <div>
                                <div class="text-uppercase small fw-semibold opacity-75">Wellness Score</div>
                                <div class="h3 mb-0">85%</div>
                                <div class="small opacity-75">Great progress!</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-md-4">
                    <div class="card stat-card gradient-energy shadow-soft h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="icon-wrap me-3">
                                <Dumbbell :size="24" />
                            </div>
                            <div>
                                <div class="text-uppercase small fw-semibold opacity-75">Activity Minutes</div>
                                <div class="h3 mb-0">45</div>
                                <div class="small opacity-75">30 mins to goal</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-12 col-lg-6">
                    <div class="card shadow-soft h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h2 class="h5 mb-0 d-flex align-items-center gap-2">
                                    <CheckCircle2 class="text-primary" :size="20" /> Today’s Tasks
                                </h2>
                                <button class="btn btn-sm btn-link text-decoration-none">View All</button>
                            </div>

                            <div class="d-flex flex-column gap-2">
                                <div v-for="(task, i) in tasks" :key="i"
                                    class="d-flex align-items-center gap-3 p-2 rounded-3 hover-bg">
                                    <div class="d-inline-flex align-items-center justify-content-center rounded-circle border"
                                        :class="task.completed ? 'bg-primary border-primary' : 'border-secondary-subtle'"
                                        style="width: 22px; height: 22px;">
                                        <CheckCircle2 v-if="task.completed" :size="16" class="text-white" />
                                    </div>
                                    <div class="flex-grow-1">
                                        <div
                                            :class="['fw-medium', task.completed ? 'text-decoration-line-through text-secondary' : '']">
                                            {{ task.title }}
                                        </div>
                                        <div class="small text-secondary">{{ task.time }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-lg-6">
                    <div class="card shadow-soft h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h2 class="h5 mb-0 d-flex align-items-center gap-2">
                                    <TrendingUp class="text-success" :size="20" /> Module Progress
                                </h2>
                            </div>

                            <div class="d-flex flex-column gap-3">
                                <div v-for="m in modules" :key="m.name">
                                    <div class="d-flex justify-content-between mb-1">
                                        <span class="small fw-semibold">{{ m.name }}</span>
                                        <span class="small text-secondary">{{ m.progress }}%</span>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar"
                                            :style="{ width: m.progress + '%' }" :aria-valuenow="m.progress"
                                            aria-valuemin="0" aria-valuemax="100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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

/* Card hover effect */
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

/* Badge text */
.badge {
    text-transform: capitalize;
}

.shadow-soft {
    box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
}

.hover-bg:hover {
    background: rgba(0, 0, 0, .03);
}

.icon-wrap {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(0, 0, 0, .05);
}

.gradient-primary {
    background: linear-gradient(135deg, #e9f2ff 0%, #f5f9ff 100%);
}

.gradient-wellness {
    background: linear-gradient(135deg, #eafaf1 0%, #f4fff8 100%);
}

.gradient-energy {
    background: linear-gradient(135deg, #fff1e6 0%, #fff6ef 100%);
}

.stat-card {
    border: 0;
}

.stat-card .card-body {
    padding: 1rem 1.25rem;
}
</style>