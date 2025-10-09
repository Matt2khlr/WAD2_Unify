<script>
export default {
    name: 'Recommendations',
    data() {
        return {
            // Template status (change this)
            currentStatus: {
                stress: 'Moderate',
                freeTime: '3 hours',
                upcomingDeadlines: 4,
                sleepQuality: 'Good'
            },
            // Template suggestions (change this)
            suggestions: [
                {
                    title: 'Focus Study Session',
                    description: 'Start a 50-minute Pomodoro on Data Structures. You have an assignment due tomorrow.',
                    time: 'Now',
                    priority: 'high',
                    type: 'study'
                },
                {
                    title: 'Take a Break',
                    description: "You've been working for 2 hours. Take a 15-minute break to refresh your mind.",
                    time: 'In 10 mins',
                    priority: 'medium',
                    type: 'breaktime'

                },
                {
                    title: 'Quick Workout',
                    description: 'You have 1 hour of free time at 5 PM. Perfect for a gym session or home workout.',
                    time: '5:00 PM',
                    priority: 'medium',
                    type: 'workout'
                },
                {
                    title: 'Wind Down Routine',
                    description: 'Your sleep quality is good! Maintain it by starting your bedtime routine at 10 PM.',
                    time: '10:00 PM',
                    priority: 'low',
                    type: 'bedtime'
                }
            ]
        };
    },

    computed: {
        // Status list
        statusList() {
            return [
                { key: 'stress', label: 'Stress Level', value: this.currentStatus.stress },
                { key: 'freeTime', label: 'Free Time Today', value: this.currentStatus.freeTime },
                { key: 'deadlines', label: 'Deadlines (7 days)', value: this.currentStatus.upcomingDeadlines },
                { key: 'sleep', label: 'Sleep Quality', value: this.currentStatus.sleepQuality }
            ];
        },
        // For status cards
        priorityClasses() {
            return {
                high: { badge: 'bg-danger text-white', border: 'border-danger' },
                medium: { badge: 'bg-warning text-dark', border: 'border-warning' },
                low: { badge: 'bg-secondary', border: 'border-secondary' },
                fallback: { badge: 'bg-light text-dark', border: 'border-light' }
            };
        },
        // Icons
        iconByType() {
            return { study: '📘', breaktime: '☕', workout: '🏋️', bedtime: '🌙', fallback: '✨' };
        }
    },
    methods: {
        badgeClass(priority) {
            return (this.priorityClasses[priority] || this.priorityClasses.fallback).badge;
        },
        borderClass(priority) {
            return (this.priorityClasses[priority] || this.priorityClasses.fallback).border;
        },
        iconForType(type) {
            return this.iconByType[type] || this.iconByType.fallback;
        }
    }
};
</script>

<template>
    <div class="container py-4">
        <!-- Header -->
        <h2>Personalized recommendations</h2>
        <p class="text-muted mb-4">
            Based on schedule and wellbeing data
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
                <div class="card h-100 border-2" :class="borderClass(suggestion.priority)">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-2">
                            <div class="me-2 fs-5">{{ iconForType(suggestion.type) }}</div>
                            <h6 class="mb-0">{{ suggestion.title }}</h6>
                            <span class="badge ms-auto" :class="badgeClass(suggestion.priority)">{{ suggestion.priority
                                }}</span>
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

        <!-- Description of methodology -->
        <div class="mt-4">
            <div class="card">
                <div class="card-body">
                    <h6>Methodology of recommendations</h6>
                    <p class="mb-2">
                        Recommendations are given based on workload, stress, free time, and recent wellness logs.
                    </p>
                    <ul class="mb-0">
                        <li>Considers schedule, deadlines, and wellness metrics</li>
                        <li>Adapts to usage patterns and preferences</li>
                        <li>Updates across the day as context changes</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card {
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.badge {
    text-transform: capitalize;
}
</style>