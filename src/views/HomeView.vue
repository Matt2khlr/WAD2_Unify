<script>
import { BookOpen, Heart, Dumbbell, CheckCircle2, Clock, TrendingUp } from "lucide-vue-next";
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { loadGoogleMaps } from "@/plugins/googleMaps";

export default {
    name: 'YourComponentName',

    components: {
        BookOpen,
        Heart,
        Dumbbell,
        CheckCircle2,
        Clock,
        TrendingUp
    },

    data() {
        return {
            tasks: [
                { title: "Complete Data Structures Assignment", time: "Due: 6 PM", completed: false },
                { title: "Review Calculus Notes", time: "30 mins", completed: true },
                { title: "Pomodoro Session: Physics", time: "25 mins", completed: true },
                { title: "Evening Workout", time: "5 PM", completed: false },
            ],

            modules: [],

            currentStatus: {
                stress: 'Moderate',
                freeTime: '3 hours',
                upcomingDeadlines: 4,
                sleepQuality: 'Good'
            },

            suggestions: [
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
            ],

            priorityClasses: {
                high: { badge: 'bg-danger text-white' },
                medium: { badge: 'bg-warning text-dark' },
                low: { badge: 'bg-success' },
                default: { badge: 'bg-light text-dark' }
            },

            icons: {
                study: '📘',
                break: '☕',
                exercise: '🏋️',
                sleep: '🌙',
                default: '✨'
            },

            userId: null,
            syncEnabled: false,
            accessToken: null,
            syncInterval: null,
            events: [],
            focus: new Date(),

            currentEvent: {
                id: null,
                name: '',
                description: '',
                start: '',
                end: '',
                colour: '#FF7A17',
                priority: 'Low',
                location: null,
                locationName: '',
                source: 'firestore',
                synced: false,
                gEventId: null
            },
        };
    },

    computed: {
        statusList() {
            return [
                { key: 'stress', label: 'Stress Level', value: this.currentStatus.stress },
                { key: 'freeTime', label: 'Free Time Today', value: this.currentStatus.freeTime },
                { key: 'deadlines', label: 'Deadlines (7 days)', value: this.currentStatus.upcomingDeadlines },
                { key: 'sleep', label: 'Sleep Quality', value: this.currentStatus.sleepQuality }
            ];
        },

        allEvents() {
            return this.events.map(event => {
                const start = new Date(event.start)
                const end = new Date(event.end)

                return {
                    ...event,
                    name: event.name,
                    start: start,
                    end: end,
                    title: event.name,
                    color: event.colour,
                    timed: true
                }
            })
        },

        weekEvents() {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

            // Calculate End of Week (Sunday)
            const endOfWeek = new Date(today)
            const dayOfWeek = today.getDay()
            const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
            endOfWeek.setDate(today.getDate() + daysUntilSunday)
            endOfWeek.setHours(23, 59, 59, 999)

            // Filter Events for Current Week
            const thisWeekEvents = this.events.filter(event => {
                const eventDate = new Date(event.start)
                return eventDate >= today && eventDate <= endOfWeek
            })

            // Group Events by Day
            const grouped = {}

            thisWeekEvents.forEach(event => {
                const eventDate = new Date(event.start)
                const dateKey = eventDate.toDateString()

                if (!grouped[dateKey]) {
                    grouped[dateKey] = {
                        date: eventDate,
                        dayLabel: this.formatDayLabel(eventDate),
                        events: []
                    }
                }

                grouped[dateKey].events.push(event)
            })

            // Sort Events by Time and Priority
            const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }

            Object.values(grouped).forEach(dayGroup => {
                dayGroup.events.sort((a, b) => {
                    const timeCompare = new Date(a.start) - new Date(b.start)
                    if (timeCompare !== 0) return timeCompare
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                })
            })

            // Convert to Array & Sort by Date
            return Object.values(grouped).sort((a, b) => a.date - b.date)
        },

        averageSleep() {
            let total = 0
            this.sleepData.forEach(day => {
                total += day.hours;
            });
            const avgSleep = total / this.sleepData.length;
            return avgSleep.toFixed(1);
        },
    },

    methods: {
        async loadModuleProgress() {
            if (!this.userId) {
                console.log('No user authenticated, skipping module progress load');
                return;
            }

            try {
                // Load topics from Firebase
                const q = query(collection(db, 'studydata'), where('userId', '==', this.userId));
                const querySnapshot = await getDocs(q);

                // Group topics by module and calculate progress
                const moduleStats = {};

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const moduleName = data.module;

                    if (!moduleStats[moduleName]) {
                        moduleStats[moduleName] = {
                            total: 0,
                            completed: 0
                        };
                    }

                    moduleStats[moduleName].total++;
                    if (data.completed) {
                        moduleStats[moduleName].completed++;
                    }
                });

                // Convert to array and calculate percentages
                this.modules = Object.keys(moduleStats).map(moduleName => {
                    const stats = moduleStats[moduleName];
                    const progress = stats.total > 0
                        ? Math.round((stats.completed / stats.total) * 100)
                        : 0;

                    return {
                        name: moduleName,
                        progress: progress,
                        completed: stats.completed,
                        total: stats.total
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));

                console.log('Module progress loaded:', this.modules);
            } catch (error) {
                console.error('Error loading module progress:', error);
            }
        },

        getPriorityClass(suggestion) {
            const priorityClass = this.priorityClasses[suggestion.priority] || this.priorityClasses.default;
            return { badge: priorityClass.badge };
        },

        iconForType(type) {
            return this.icons[type] || this.icons.default;
        },

        // Google Calendar Toggle Handler
        async toggleSync() {
            if (this.syncEnabled) {
                // Turn On Sync
                await this.connectGoogle();
            } else {
                // Turn Off Sync
                this.disconnectGoogle();
            }
        },

        // Connect to Google Account Login
        async connectGoogle() {
            if (!window.gapi || !window.google) {
                alert('Error Connecting to Google Account Login. Please Try Again.');
                this.syncEnabled = false;
                return;
            }

            // Check for Saved Google Account Token
            const savedToken = sessionStorage.getItem('google_token')
            if (savedToken) {
                this.accessToken = savedToken;
                await this.waitForGoogleAPI();
                await this.syncWithGoogle();
                this.startAutoSync();
                return;
            }

            // Generate New Google Account Token
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/calendar',
                callback: async (response) => {
                    if (response.error) {
                        console.log(response.error);
                        this.syncEnabled = false;
                        return
                    }

                    this.accessToken = response.access_token;
                    sessionStorage.setItem('google_token', this.accessToken);

                    await this.waitForGoogleAPI();
                    await this.syncWithGoogle();
                    this.startAutoSync();
                }
            })

            tokenClient.requestAccessToken()
        },

        // Disconnect from Google Calendar
        disconnectGoogle() {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }

            sessionStorage.removeItem('google_token')
            this.accessToken = null;
        },

        // Auto Sync with Google Calendar (Every 2 Minutes)
        startAutoSync() {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }

            this.syncInterval = setInterval(() => {
                this.syncWithGoogle()
            }, 1 * 60 * 1000)
        },

        async initGoogle() {
            try {
                // Load Google Calendar API Client
                await new Promise((resolve) => {
                    gapi.load('client', resolve)
                })

                // Initialise Google Calendar Client
                await gapi.client.init({
                    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
                })

                console.log('Google Calendar API Initialised')
            } catch (error) {
                console.error('Error Initialising Google Calendar API:', error)
            }
        },

        async syncWithGoogle() {
            if (!this.accessToken) {
                console.log('No Access Token.');
                return;
            }

            try {
                // Use Fetch API instead of gapi.client.calendar
                const response = await fetch(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&showDeleted=false&timeMin=' + new Date().toISOString() + '&maxResults=100',
                    {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Accept': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const googleApiEvents = data.items || [];
                const googleEventIdsFromApi = new Set(googleApiEvents.map(item => item.id));

                const gEventIdToDocIdMap = new Map();
                this.events
                    .filter(event => event.gEventId)
                    .forEach(event => {
                        gEventIdToDocIdMap.set(event.gEventId, event.id);
                    });

                // Add/Update Pulled Events in Cloud Firestore
                for (const item of googleApiEvents) {
                    let location = null;
                    let locationName = '';

                    if (item.location) {
                        const parsed = await this.geocodeLocation(item.location);
                        if (parsed) {
                            location = parsed.geopoint;
                            locationName = parsed.name;
                        } else {
                            locationName = item.location;
                        }
                    }

                    const eventData = {
                        userId: this.userId,
                        name: item.summary || 'Untitled Event',
                        description: item.description || '',
                        start: new Date(item.start.dateTime || item.start.date),
                        end: new Date(item.end.dateTime || item.end.date),
                        locationName: locationName,
                        location: location,
                        synced: true,
                        gEventId: item.id
                    };

                    if (gEventIdToDocIdMap.has(item.id)) {
                        const firestoreDocId = gEventIdToDocIdMap.get(item.id);
                        console.log(`Updating Firestore Event ${firestoreDocId} with Google Calendar Event ${item.id}`);
                        await updateDoc(doc(db, 'events', firestoreDocId), eventData);
                    } else {
                        eventData.colour = '#9FE1E7';
                        eventData.source = 'google';
                        eventData.priority = 'Low';
                        console.log(`Creating New Firestore Document for Google Calendar Event ${item.id}`);
                        await setDoc(doc(db, 'events', item.id), eventData);
                    }
                }

                // Remove Deleted Google Calendar Events from Cloud Firestore
                const localGoogleEvents = this.events.filter(event => event.source === 'google');
                for (const localEvent of localGoogleEvents) {
                    if (!googleEventIdsFromApi.has(localEvent.id)) {
                        console.log(`Deleting Google Event from Cloud Firestore: ${localEvent.name} (${localEvent.id})`);
                        await deleteDoc(doc(db, 'events', localEvent.id));
                    }
                }

                // Add unsynched Cloud Firestore Events to Google Calendar
                const eventsToPush = this.events.filter(event => event.source === 'firestore' && !event.synced);

                for (const event of eventsToPush) {
                    try {
                        const resource = {
                            summary: event.name,
                            description: event.description,
                            start: { dateTime: new Date(event.start).toISOString() },
                            end: { dateTime: new Date(event.end).toISOString() },
                            location: event.locationName || ''
                        };

                        const insertResponse = await fetch(
                            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${this.accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(resource)
                            }
                        );

                        if (insertResponse.ok) {
                            const result = await insertResponse.json();
                            await updateDoc(doc(db, 'events', event.id), {
                                synced: true,
                                gEventId: result.id
                            });
                            console.log(`Synced Event "${event.name}" to Google Calendar.`);
                        } else {
                            console.error(`Error Adding Event "${event.name}" to Google Calendar:`, insertResponse.status);
                        }
                    } catch (err) {
                        console.error(`Error Adding Event "${event.name}" to Google Calendar:`, err);
                    }
                }
            } catch (error) {
                console.error('Overall Synchronisation Error:', error);
            }
        },

        // Wait for Google API to be Ready
        async waitForGoogleAPI() {
            return new Promise((resolve) => {
                const checkAPI = () => {
                    if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
                        console.log('Google Calendar API is ready')
                        resolve()
                    } else {
                        console.log('Waiting for Google Calendar API...')
                        setTimeout(checkAPI, 500)
                    }
                }
                checkAPI()
            })
        },

        // Convert Location to Geopoint
        async geocodeLocation(address) {
            try {
                const { Geocoder } = await google.maps.importLibrary("geocoding")
                const geocoder = new Geocoder()

                return new Promise((resolve) => {
                    geocoder.geocode({ address: address }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            const loc = results[0].geometry.location
                            resolve({
                                geopoint: new GeoPoint(loc.lat(), loc.lng()),
                                name: results[0].formatted_address
                            })
                        } else {
                            resolve(null)
                        }
                    })
                })
            } catch (err) {
                return null
            }
        },

        // Update Event in Google Calendar
        async updateInGoogle(eventId, eventData) {
            try {
                const resource = {
                    summary: eventData.name,
                    description: eventData.description,
                    start: {
                        dateTime: eventData.start.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: eventData.end.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                }

                if (eventData.locationName) {
                    resource.location = eventData.locationName
                }

                await gapi.client.calendar.events.update({
                    calendarId: 'primary',
                    eventId: eventId,
                    resource: resource
                })
            }
            catch (error) {
                console.log('Error Updating Event in Google Calendar:', error);
            }
        },

        // Add Event to Google Calendar
        async addToGoogle(eventData) {
            try {
                const startDate = eventData.start instanceof Date ? eventData.start : new Date(eventData.start);
                const endDate = eventData.end instanceof Date ? eventData.end : new Date(eventData.end);

                const resource = {
                    summary: eventData.name,
                    description: eventData.description,
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    location: eventData.locationName || ''
                };

                const response = await fetch(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(resource)
                    }
                );

                if (!response.ok) {
                    throw new Error(`Calendar API error: ${response.status}`);
                }

                const result = await response.json();
                console.log('Event Added to Google Calendar:', result.id);
                return result.id;
            } catch (error) {
                console.error('Error Adding Event to Google Calendar:', error);
                return null;
            }
        },

        // Open Google Maps
        openMap(event) {
            if (!event.location) return

            const lat = event.location.latitude
            const lng = event.location.longitude
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        },

        // Format Event Date
        formatShortDate(dateTime) {
            const date = new Date(dateTime)
            return date.toLocaleDateString('en-UK', {
                day: 'numeric',
                month: 'short'
            })
        },

        // Format Event Time
        formatEventTime(dateTime) {
            const date = new Date(dateTime)
            return date.toLocaleTimeString('en-UK', {
                hour: 'numeric',
                minute: '2-digit',
            })
        },

        // Format day label (e.g., "Today", "Tomorrow", "Wed, Oct 23")
        formatDayLabel(date) {
            const today = new Date()
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())

            if (dateOnly.getTime() === todayOnly.getTime()) {
                return 'Today'
            } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
                return 'Tomorrow'
            } else {
                return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                })
            }
        },

        // Listen to Cloud Firestore and Get Events
        listenToEvents() {
            const q = query(collection(db, 'events'), where('userId', '==', this.userId));
            onSnapshot(q, (snapshot) => {
                this.events = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    start: doc.data().start.toDate(),
                    end: doc.data().end.toDate(),
                }))
            });
            console.log(this.events);
        },

        getContrastColor(hexColor) {
            // Convert HEX to RGB
            const color = hexColor.replace('#', '')
            const r = parseInt(color.substr(0, 2), 16)
            const g = parseInt(color.substr(2, 2), 16)
            const b = parseInt(color.substr(4, 2), 16)

            // Calculate Perceived Brightness
            const brightness = (r * 299 + g * 587 + b * 114) / 1000

            // Return Black or White Text Colour based on Brightness
            return brightness > 128 ? '#000000' : '#ffffff'
        },

        async fetchLatestSleepLog() {
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
                console.log("Fetched sleep log:", latestLog.sleepData);
                }
            }
        },
    },
    async mounted() {
        // Set up authentication listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.userId = user.uid;
                console.log('User authenticated:', this.userId);

                // Load module progress from Firebase
                await loadGoogleMaps();
                await this.loadModuleProgress();
                this.listenToEvents();
                await this.initGoogle();
            } else {
                this.userId = null;
                this.modules = [];
                console.log('No user authenticated');
            }
        });

        // Check for Saved Session
        const savedToken = sessionStorage.getItem('google_token')
        if (savedToken) {
            this.syncEnabled = true;
            this.accessToken = savedToken;

            await this.waitForGoogleAPI()
            await this.syncWithGoogle()
            this.startAutoSync()
        }
    },

    beforeUnmount() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
    beforeUnmount() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}
</script>

<template>
    <div class="min-vh-100 bg-light">
        <header class="bg-white border-bottom">
            <div class="container px-3 py-5">
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
                    <div class="card h-100">
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
        <div class="container px-2 py-3">
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
                        <div class="card-body d-flex flex-column">
                            <!-- Header -->
                            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <h5 class="mb-0 fw-semibold d-flex align-items-center gap-2">
                                    <i class="mdi mdi-calendar-week"></i>
                                    This Week's Events
                                </h5>

                                <div class="ios-switch-container">
                                    <input type="checkbox" id="weekGoogleSync" class="ios-switch-input"
                                        v-model="syncEnabled" @change="toggleSync">
                                    <label class="ios-switch-label" for="weekGoogleSync">
                                        <span class="ios-switch-slider"></span>
                                    </label>
                                    <label class="small text-muted ms-2" for="weekGoogleSync" style="cursor: pointer;">
                                        <i class="mdi mdi-google"></i>
                                    </label>
                                </div>
                            </div>

                            <!-- Events List -->
                            <div class="flex-grow-1" style="overflow-y: auto; max-height: 300px;">
                                <div v-if="weekEvents.length > 0" class="d-flex flex-column gap-3">
                                    <div v-for="(dayGroup, index) in weekEvents" :key="index">
                                        <!-- Day Header -->
                                        <div class="d-flex align-items-center mb-2">
                                            <span class="badge fw-medium px-2 py-1"
                                                style="font-size: 0.75rem; background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);">
                                                {{ dayGroup.dayLabel }}
                                            </span>
                                            <div class="flex-grow-1 ms-2" style="height: 1px; background: #e0e0e0;">
                                            </div>
                                        </div>

                                        <!-- Events -->
                                        <div class="d-flex flex-column gap-2">
                                            <div v-for="event in dayGroup.events" :key="event.id"
                                                class="event-card py-2 px-3 rounded-2 border"
                                                :style="{ backgroundColor: event.colour, color: getContrastColor(event.colour) }">
                                                <div class="d-flex align-items-start justify-content-between gap-2">
                                                    <div class="flex-grow-1">
                                                        <!-- Event Name -->
                                                        <div class="fw-medium mb-1"
                                                            style="font-size: 1rem; line-height: 1.3;">
                                                            {{ event.name }}
                                                        </div>

                                                        <!-- Event Information (Date, Time, Priority) -->
                                                        <div class="d-flex align-items-center gap-2 flex-wrap"
                                                            style="font-size: 0.9rem;">
                                                            <!-- Date -->
                                                            <span class="d-flex align-items-center gap-1">
                                                                <i class="mdi mdi-calendar-blank"
                                                                    style="font-size: 0.9rem;"></i>
                                                                {{ formatShortDate(event.start) }}
                                                            </span>

                                                            <!-- Time -->
                                                            <span class="d-flex align-items-center gap-1">
                                                                <i class="mdi mdi-clock-outline"
                                                                    style="font-size: 0.9rem;"></i>
                                                                {{ formatEventTime(event.start) }}
                                                            </span>

                                                            <!-- Priority Badge -->
                                                            <span v-if="event.priority" class="badge" :class="{
                                                                'bg-danger': event.priority === 'High',
                                                                'bg-warning text-dark': event.priority === 'Medium',
                                                                'bg-success': event.priority === 'Low'
                                                            }" style="font-size: 0.8rem; padding: 2px 6px;">
                                                                {{ event.priority }}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <!-- Google Maps Button -->
                                                    <button v-if="event.location || event.locationName"
                                                        @click.stop="openMap(event)" class="map-button"
                                                        title="Open in Google Maps">
                                                        <i class="mdi mdi-map-marker map-icon"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Empty State -->
                                <div v-else class="text-center py-5">
                                    <i class="mdi mdi-calendar-blank-outline text-muted"
                                        style="font-size: 3rem; opacity: 0.3;"></i>
                                    <p class="text-muted mt-2 mb-0">No Upcoming Events This Week</p>
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

                            <div v-if="modules.length > 0" class="d-flex flex-column gap-3">
                                <div v-for="m in modules" :key="m.name">
                                    <div class="d-flex justify-content-between mb-1">
                                        <span class="small fw-semibold">{{ m.name }}</span>
                                        <span class="small text-secondary">{{ m.progress }}% ({{ m.completed }}/{{
                                            m.total }})</span>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar"
                                            :style="{ width: m.progress + '%' }" :aria-valuenow="m.progress"
                                            aria-valuemin="0" aria-valuemax="100" />
                                    </div>
                                </div>
                            </div>
                            <div v-else class="text-center text-muted py-4">
                                <i class="mdi mdi-school-outline" style="font-size: 3rem;"></i>
                                <p class="mb-0 mt-2">No study topics yet</p>
                                <small>Add topics in the Study Tools page to track your progress</small>
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
    border-radius: 0.75rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* Card Hover Effect */
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

/* Badge Text */
.badge {
    text-transform: capitalize;
}

/* Paragraph text */
p {
    color: black !important;
}

/* Icon wrapper */
.icon-wrap {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(0, 0, 0, .05);
}

/* Icon centering */
.icon-wrap svg {
    transform: translate(4px, 1px);
}

/* Gradient Backgrounds */
.gradient-primary {
    background: linear-gradient(135deg, #e9f2ff 0%, #f5f9ff 100%);
}

.gradient-wellness {
    background: linear-gradient(135deg, #eafaf1 0%, #f4fff8 100%);
}

.gradient-energy {
    background: linear-gradient(135deg, #fff1e6 0%, #fff6ef 100%);
}

/* Stat Cards */
.stat-card {
    border: 0;
}

/* Stat Card Body */
.stat-card .card-body {
    padding: 1rem 1.25rem;
}

/* Event Cards*/
.event-card {
    background: #fafafa;
    transition: all 0.2s ease;
}

.event-card:hover {
    background: #f5f5f5;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* Custom Scrollbar for Event Card */
.card-body>div {
    padding-right: 8px;
}

.card-body>div::-webkit-scrollbar {
    width: 6px;
}

.card-body>div::-webkit-scrollbar-track {
    background: transparent;
}

.card-body>div::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 3px;
}

.card-body>div::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}

/* CSS for Toggle Switch */
/* iOS Toggle Switch Container */
.ios-switch-container {
    display: flex;
    align-items: center;
    margin-bottom: 0;
}

/* Hide default checkbox */
.ios-switch-input {
    display: none;
}

/* Switch Label/Track */
.ios-switch-label {
    position: relative;
    display: inline-block;
    width: 42px;
    height: 24px;
    cursor: pointer;
    margin: 0;
}

/* Switch Track (background) */
.ios-switch-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e0e0e0;
    border-radius: 24px;
    transition: all 0.3s ease;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Switch Knob */
.ios-switch-slider::before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Checked State - Gradient Background */
.ios-switch-input:checked+.ios-switch-label .ios-switch-slider {
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

/* Checked State - Move Knob */
.ios-switch-input:checked+.ios-switch-label .ios-switch-slider::before {
    transform: translateX(18px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Hover Effect */
.ios-switch-label:hover .ios-switch-slider {
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* Active/Pressed Effect */
.ios-switch-input:active+.ios-switch-label .ios-switch-slider::before {
    width: 24px;
}

/* Focus State */
.ios-switch-input:focus+.ios-switch-label .ios-switch-slider {
    outline: 2px solid #667eea;
    outline-offset: 2px;
}

/* Disabled State */
.ios-switch-input:disabled+.ios-switch-label {
    opacity: 0.5;
    cursor: not-allowed;
}

/* CSS for Map Button */
.map-button {
    width: 32px;
    height: 32px;
    margin-top: 7.5px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
}

/* Icon */
.map-icon {
    font-size: 1rem;
    color: white;
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;
}

/* Pseudo element for smooth transition */
.map-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 0;
}

/* Hover state */
.map-button:hover {
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    transform: translateY(-3px);
}

.map-button:hover::before {
    opacity: 1;
}

.map-button:hover .map-icon {
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Active/pressed */
.map-button:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

/* Focus outline */
.map-button:focus-visible {
    outline: 2px solid #667eea;
    outline-offset: 2px;
}
</style>