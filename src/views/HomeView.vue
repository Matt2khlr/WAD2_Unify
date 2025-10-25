<script>
import { BookOpen, Heart, Dumbbell, CheckCircle2, Clock, TrendingUp, Wheat } from "lucide-vue-next";
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';

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
            
            modules: [
                { name: "Data Structures", progress: 75 },
                { name: "Calculus II", progress: 60 },
                { name: "Physics", progress: 45 },
                { name: "Web Development", progress: 90 },
            ],
            
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
                high: { badge: 'bg-danger text-white', border: 'border-danger' },
                medium: { badge: 'bg-warning text-dark', border: 'border-warning' },
                low: { badge: 'bg-success', border: 'border-success' },
                default: { badge: 'bg-light text-dark', border: 'border-light' }
            },
            
            icons: {
                study: '📘',
                break: '☕',
                exercise: '🏋️',
                sleep: '🌙',
                default: '✨'
            },

            //userId: auth.currentUser?.uid,
            userId: 'u1',
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
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }
            
            Object.values(grouped).forEach(dayGroup => {
            dayGroup.events.sort((a, b) => {
                const timeCompare = new Date(a.start) - new Date(b.start)
                if (timeCompare !== 0) return timeCompare
                return priorityOrder[a.priority] - priorityOrder[b.priority]
            })
            })

            // Convert to Array & Sort by Date
            return Object.values(grouped).sort((a, b) => a.date - b.date)
        }
    },
    
    methods: {
        getPriorityClass(suggestion) {
            const priorityClass = this.priorityClasses[suggestion.priority] || this.priorityClasses.default;
            return { border: priorityClass.border, badge: priorityClass.badge };
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
                client_id: '1071880442683-199adq7lhl4k4i867qffge4gfb9ca6a8.apps.googleusercontent.com',
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
                apiKey: 'AIzaSyDyg_B2fzJsgaDO8bjyyikjVeee4AM08kI',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
                })

                console.log('Google Calendar API Initialised')
            } catch (error) {
                console.error('Error Initialising Google Calendar API:', error)
            }
        },

        async syncWithGoogle() {
            if (!window.gapi?.client?.calendar) {
                console.log('Google Calendar API not initialised yet.');
                return;
            }
            if (!this.accessToken) {
                console.log('No Access Token.');
                return;
            }

            try {
                // Pull Events from Google Calendar API
                const response = await gapi.client.calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                showDeleted: false,
                singleEvents: true,
                maxResults: 100,
                orderBy: 'startTime'
                });

                const googleApiEvents = response.result.items || [];
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
                    } 
                    else {
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
                } 
                else {
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

                    const insertResponse = await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: resource
                    });
                    
                    // Update Sync Status in Cloud Firestore
                    if (insertResponse.result) {
                    await updateDoc(doc(db, 'events', event.id), {
                        synced: true,
                        gEventId: insertResponse.result.id
                    });
                    console.log(`Synced Event "${event.name}" to Google Calendar.`);
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
                const startDate = eventData.start instanceof Date ? eventData.start : new Date(eventData.start)
                const endDate = eventData.end instanceof Date ? eventData.end : new Date(eventData.end)

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
                }
                }

                if (eventData.locationName) {
                resource.location = eventData.locationName
                }

                const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: resource
                })

                console.log('Event Added to Google Calendar:', response.result.id)
                return response.result.id
            } 
            catch (error) {
                console.error('Error Adding Event to Google Calendar:', error)
                return null
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
    },

    async mounted() {
        //this.checkAuth()
        this.listenToEvents();
        await this.initGoogle();
        
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
        }
    }

};
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
                        <div class="card-body d-flex flex-column">
                            <!-- Header -->
                            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <h5 class="mb-0 fw-semibold d-flex align-items-center gap-2">
                                    <i class="mdi mdi-calendar-week"></i>
                                    This Week's Events
                                </h5>
                                
                                <div class="form-check form-switch mb-0">
                                    <input 
                                    class="form-check-input" 
                                    type="checkbox" 
                                    id="weekGoogleSync"
                                    v-model="syncEnabled"
                                    @change="toggleSync"
                                    >
                                    <label class="form-check-label small text-muted" for="weekGoogleSync" style="cursor: pointer;">
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
                                    <span class="badge text-light fw-medium px-2 py-1" style="font-size: 0.75rem; background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);">
                                    {{ dayGroup.dayLabel }}
                                    </span>
                                    <div class="flex-grow-1 ms-2" style="height: 1px; background: #e0e0e0;"></div>
                                </div>

                                <!-- Events -->
                                <div class="d-flex flex-column gap-2">
                                    <div 
                                    v-for="event in dayGroup.events" 
                                    :key="event.id"
                                    class="event-card py-2 px-3 rounded-2 border"
                                    :style="{ backgroundColor: event.colour, color: getContrastColor(event.colour) }"
                                    >
                                    <div class="d-flex align-items-start justify-content-between gap-2">
                                        <div class="flex-grow-1">
                                        <!-- Event Name -->
                                        <div class="fw-medium mb-1" style="font-size: 0.875rem; line-height: 1.3;">
                                            {{ event.name }}
                                        </div>
                                        
                                        <!-- Event Information (Date, Time, Priority) -->
                                        <div class="d-flex align-items-center gap-2 flex-wrap" style="font-size: 0.75rem;">
                                            <!-- Date -->
                                            <span class="d-flex align-items-center gap-1">
                                            <i class="mdi mdi-calendar-blank" style="font-size: 0.875rem;"></i>
                                            {{ formatShortDate(event.start) }}
                                            </span>
                                            
                                            <!-- Time -->
                                            <span class="d-flex align-items-center gap-1">
                                            <i class="mdi mdi-clock-outline" style="font-size: 0.875rem;"></i>
                                            {{ formatEventTime(event.start) }}
                                            </span>
                                            
                                            <!-- Priority Badge -->
                                            <span 
                                            v-if="event.priority"
                                            class="badge"
                                            :class="{
                                                'bg-danger': event.priority === 'High',
                                                'bg-warning text-dark': event.priority === 'Medium',
                                                'bg-success': event.priority === 'Low'
                                            }"
                                            style="font-size: 0.65rem; padding: 2px 6px;"
                                            >
                                            {{ event.priority }}
                                            </span>
                                        </div>
                                        </div>

                                        <!-- Google Maps Button -->
                                        <button 
                                        v-if="event.location || event.locationName"
                                        @click.stop="openMap(event)"
                                        class="btn btn-sm d-flex align-items-center justify-content-center"
                                        style="width: 32px; height: 32px; margin-top: 5.5px; flex-shrink: 0; background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);"
                                        title="Open in Google Maps"
                                        >
                                        <i class="mdi mdi-map-marker" style="font-size: 1rem; color: white;"></i>
                                        </button>
                                    </div>
                                    </div>
                                </div>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div v-else class="text-center py-5">
                                <i class="mdi mdi-calendar-blank-outline text-muted" style="font-size: 3rem; opacity: 0.3;"></i>
                                <p class="text-muted mt-2 mb-0">No events this week</p>
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

.event-card {
  background: #fafafa;
  transition: all 0.2s ease;
}

.event-card:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* Custom Scrollbar for Event Card */
.card-body > div {
  padding-right: 8px; /* Creates gap between content and scrollbar */
}

.card-body > div::-webkit-scrollbar {
  width: 6px;
}

.card-body > div::-webkit-scrollbar-track {
  background: transparent;
}

.card-body > div::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.card-body > div::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

</style>