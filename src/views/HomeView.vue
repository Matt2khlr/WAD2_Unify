<script>
import { BookOpen, Heart, Dumbbell, Clock, TrendingUp, Flame, Activity, Utensils } from "lucide-vue-next";
import { collection, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadGoogleMaps } from "@/plugins/googleMaps";

export default {
    name: 'Home',

    components: {
        BookOpen,
        Heart,
        Dumbbell,
        Clock,
        TrendingUp,
        Flame,
        Activity,
        Utensils
    },

    data() {
        return {
            // Loading state
            isLoading: true,

            // Recommendations
            currentStatus: {
                stress: '',
                sleepQuality: ''
            },
            stressFactorsCount: 0,
            avgSleepQuality: 0,
            suggestions: [],

            modules: [],
            userId: null,
            syncEnabled: false,
            accessToken: null,
            syncInterval: null,
            events: [],
            focus: new Date(),

            // Study Sessions
            studySessionsToday: 0,
            totalStudyTimeToday: 0, // in minutes

            // Journal data
            journalHistory: [],
            unsubscribeJournal: null,

            // Meals and workouts data
            meals: [],
            workouts: [],
            unsubscribeMeals: null,
            unsubscribeWorkouts: null,
        };
    },

    computed: {
        statusList() {
            return [
                { key: 'sessions', label: 'Study Sessions Today', value: this.studySessionsToday, subtext: `${this.formatStudyTime(this.totalStudyTimeToday)} focused time` },
                { key: 'stress', label: 'Stress Level', value: this.currentStatus.stress, subtext: `${this.stressFactorsCount} stress factor${this.stressFactorsCount !== 1 ? 's' : ''} identified` },
                { key: 'activity', label: 'Activity Minutes', value: `${this.totalsWorkouts.minutes} min`, subtext: `${this.totalsWorkouts.kcal} kcal burned` },
                { key: 'sleep', label: 'Sleep Quality', value: this.currentStatus.sleepQuality, subtext: `${this.avgSleepQuality} hrs average this week` }
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

            // Filter Events for Current Week (Including Ongoing Events)
            const thisWeekEvents = this.events.filter(event => {
                const eventStart = new Date(event.start)
                const eventEnd = new Date(event.end)
                return eventEnd >= today && eventStart <= endOfWeek
            })

            // Group Events by Day
            const grouped = {}

            thisWeekEvents.forEach(event => {
                const eventStart = new Date(event.start)
                const eventEnd = new Date(event.end)
                
                // Group Ongoing Events under Today
                let displayDate = eventStart >= today ? eventStart : today
                
                if (displayDate <= endOfWeek) {
                const dateKey = displayDate.toDateString()

                if (!grouped[dateKey]) {
                    grouped[dateKey] = {
                    date: displayDate,
                    dayLabel: this.formatDayLabel(displayDate),
                    events: []
                    }
                }

                const eventWithStatus = {
                    ...event,
                    isOngoing: eventStart < today && eventEnd >= today
                }

                grouped[dateKey].events.push(eventWithStatus)
                }
            })

            // Sort Events by Time and Priority
            const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }

            Object.values(grouped).forEach(dayGroup => {
                dayGroup.events.sort((a, b) => {
                if (a.isOngoing && !b.isOngoing) return -1
                if (!a.isOngoing && b.isOngoing) return 1
                
                const timeCompare = new Date(a.start) - new Date(b.start)
                if (timeCompare !== 0) return timeCompare
                return priorityOrder[a.priority] - priorityOrder[b.priority]
                })
            })

            // Convert to Array & Sort by Date
            return Object.values(grouped).sort((a, b) => a.date - b.date)
            },

        totalsMeals() {
            return {
                kcal: this.meals.reduce((a, m) => a + (Number(m.kcal) || 0), 0),
                protein: this.meals.reduce((a, m) => a + (Number(m.protein) || 0), 0),
                carbs: this.meals.reduce((a, m) => a + (Number(m.carbs) || 0), 0),
                fat: this.meals.reduce((a, m) => a + (Number(m.fat) || 0), 0)
            };
        },
        totalsWorkouts() {
            return {
                minutes: this.workouts.reduce((a, w) => a + (Number(w.minutes) || 0), 0),
                kcal: this.workouts.reduce((a, w) => a + (Number(w.kcal) || 0), 0)
            };
        },
        netCalories() {
            return this.totalsMeals.kcal - this.totalsWorkouts.kcal;
        }
    },

    methods: {
        async loadCurrentStatusFromFirestore() {
            if (!this.userId) return;

            try {
                // Get stress level from latest journal entry
                const journalQuery = query(
                    collection(db, 'journals'),
                    where('userId', '==', this.userId),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                const journalSnapshot = await getDocs(journalQuery);
                let stressLevel = 'Unknown';
                if (!journalSnapshot.empty) {
                    const mood = journalSnapshot.docs[0].data().mood;
                    stressLevel = mood === 'Stressed' ? 'High' : mood === 'Great' ? 'Low' : 'Moderate';
                }

                // Get sleep quality from latest sleep log
                const sleepQuery = query(
                    collection(db, 'sleepLogs'),
                    where('userId', '==', this.userId),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                const sleepSnapshot = await getDocs(sleepQuery);
                let sleepQuality = 'Unknown';
                if (!sleepSnapshot.empty) {
                    const sleepHours = sleepSnapshot.docs[0].data().sleepHours;
                    sleepQuality = sleepHours >= 7 ? 'Good' : sleepHours >= 5 ? 'Fair' : 'Poor';
                }

                this.currentStatus = {
                    stress: stressLevel,
                    sleepQuality: sleepQuality
                };

                console.log('Current status loaded:', this.currentStatus);
            } catch (error) {
                console.error('Error loading current status:', error);
            }
        },

        generateSuggestionsFromData() {
            this.suggestions = [];
            const suggestions = [];

            // Study sessions
            if (this.studySessionsToday === 0) {
                suggestions.push({
                    title: 'Start Your First Session',
                    description: 'You haven\'t started studying yet today. Begin with a 25-minute Pomodoro session to build momentum.',
                    icon: 'BookOpen'
                });
            } else if (this.studySessionsToday < 3) {
                suggestions.push({
                    title: 'Keep It Up',
                    description: `You've had ${this.studySessionsToday} study session${this.studySessionsToday !== 1 ? 's' : ''}. Keep the momentum going with another focused session.`,
                    icon: 'BookOpen'
                });
            }

            // Break reminders
            if (this.totalStudyTimeToday >= 240) {
                suggestions.push({
                    title: 'Take a Break',
                    description: `You've been working for ${this.formatStudyTime(this.totalStudyTimeToday)}. Take a longer break to refresh.`,
                    icon: 'BookOpen'
                });
            }

            // Workout suggestions based on activity minutes
            if (this.totalsWorkouts.minutes === 0) {
                suggestions.push({
                    title: 'Get Active',
                    description: 'You haven\'t exercised today. Go for a 30 minute workout to boost your energy and burn some calories!',
                    icon: 'Activity'
                });
            } else if (this.totalsWorkouts.minutes < 30) {
                const remainingTime = 30 - this.totalsWorkouts.minutes;
                suggestions.push({
                    title: 'Quick Workout',
                    description: `You need ${remainingTime} more minutes of exercise today. Go for a quick 5 - 10 minute session!`,
                    icon: 'Activity'
                });
            } else if (this.totalsWorkouts.minutes >= 30) {
                suggestions.push({
                    title: 'Keep the Momentum',
                    description: `Great job at keeping fit! You've exercised for ${this.totalsWorkouts.minutes} minutes.`,
                    icon: 'Activity'
                });
            }

            // Sleep quality
             if (this.currentStatus.sleepQuality === 'Poor') {
                suggestions.push({
                    title: 'Improve Your Sleep',
                    description: 'Your sleep quality was poor this week. Start by establishing a consistent bedtime routine.',
                    icon: 'Clock'
                });
            } else if (this.currentStatus.sleepQuality === 'Fair') {
                suggestions.push({
                    title: 'Optimise Your Sleep',
                    description: 'Your sleep was fair this week. You can improve it by reducing screen time before bed.',
                    icon: 'Clock'
                });
            } else if (this.currentStatus.sleepQuality === 'Good') {
                suggestions.push({
                    title: 'Maintain Your Sleep Routine',
                    description: 'Your sleep quality is excellent! Keep up your bedtime routine to maintain this positive trend.',
                    icon: 'Clock'
                });
            }

            // Stress management suggestions
            if (this.currentStatus.stress === 'High') {
                suggestions.push({
                    title: 'Wind Down Routine',
                    description: 'Your stress level is high. Consider a relaxing activity like meditation to help you unwind before bed.',
                    icon: 'Heart'
                });
            } else {
                suggestions.push({
                    title: 'De-Stress Tips',
                    description: 'To keep stress levels low, take short breaks during study sessions and talk to friends or family.',
                    icon: 'Heart'
                });
            }

            this.suggestions = suggestions;
            console.log('Suggestions generated:', this.suggestions);
        },

        getStatusCardGradient(index) {
            const gradients = [
                'gradient-primary',
                'gradient-wellness',
                'gradient-energy',
                'gradient-study'
            ];
            return gradients[index] || 'gradient-primary';
        },

        getSuggestionIcon(iconName) {
            const iconMap = {
                'BookOpen': BookOpen,
                'Heart': Heart,
                'Activity': Activity,
                'Clock': Clock,
            };
            return iconMap[iconName] || BookOpen;
        },

        async loadStressFactorsCount() {
            if (!this.userId) return;

            try {
                // Fetch last 7 mood logs for this user
                const moodLogQuery = query(
                    collection(db, 'moodLogs'),
                    where('userId', '==', this.userId),
                    orderBy('date', 'desc'),
                    limit(7)
                );

                const querySnapshot = await getDocs(moodLogQuery);

                // Aggregate factor count
                const factorCount = {};
                querySnapshot.forEach(doc => {
                    const log = doc.data();
                    if (Array.isArray(log.stressFactors)) {
                        log.stressFactors.forEach(factor => {
                            factorCount[factor] = (factorCount[factor] || 0) + 1;
                        });
                    }
                });

                // Store the count of unique stress factors today
                this.stressFactorsCount = Object.keys(factorCount).length;
                console.log('Stress factors count:', this.stressFactorsCount);
            } catch (error) {
                console.error('Error loading stress factors:', error);
                this.stressFactorsCount = 0;
            }
        },

        async loadAverageSleepQuality() {
            if (!this.userId) { 
                return;
            }

            try {
                // Fetch last 7 sleep logs for this user
                const sleepQuery = query(
                    collection(db, 'sleepLogs'),
                    where('userId', '==', this.userId),
                    orderBy('date', 'desc'),
                    limit(7)
                );

                const querySnapshot = await getDocs(sleepQuery);

                if (querySnapshot.empty) {
                    this.avgSleepQuality = 0;
                    return;
                }

                // Calculate average sleep hours
                let totalHours = 0;
                querySnapshot.forEach(doc => {
                    const log = doc.data();
                    totalHours += log.sleepHours || 0;
                });

                this.avgSleepQuality = (totalHours / querySnapshot.size).toFixed(1);
                console.log('Average sleep quality this week:', this.avgSleepQuality);
            } catch (error) {
                console.error('Error loading average sleep quality:', error);
                this.avgSleepQuality = 0;
            }
        },

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

        async loadTodayStudySessions() {
            if (!this.userId) {
                console.log('No user authenticated, skipping study sessions load');
                return;
            }

            try {
                // Get today's date range (start and end of day)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                // Query study sessions from Firebase
                const q = query(
                    collection(db, 'studytimes'),
                    where('userId', '==', this.userId)
                );
                const querySnapshot = await getDocs(q);

                let sessionCount = 0;
                let totalMinutes = 0;

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();

                    // Convert Firebase Timestamp to Date
                    const startTime = data.starttime?.toDate ? data.starttime.toDate() : new Date(data.starttime);

                    // Check if session is from today
                    if (startTime >= today && startTime <= todayEnd) {
                        sessionCount++;

                        // Calculate duration
                        const endTime = data.endtime?.toDate ? data.endtime.toDate() : new Date(data.endtime);
                        const durationMs = endTime - startTime;
                        const durationMinutes = Math.round(durationMs / 60000);
                        totalMinutes += durationMinutes;
                    }
                });

                this.studySessionsToday = sessionCount;
                this.totalStudyTimeToday = totalMinutes;

                console.log(`Study sessions today: ${sessionCount}, Total time: ${totalMinutes} minutes`);
            } catch (error) {
                console.error('Error loading study sessions:', error);
            }
        },

        formatStudyTime(minutes) {
            if (minutes < 60) {
                return `${minutes} min${minutes !== 1 ? 's' : ''}`;
            }
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            }
            return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
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

        async subscribeToJournalEntries() {
            if (!this.userId) {
                this.journalHistory = [];
                if (this.unsubscribeJournal) {
                    this.unsubscribeJournal();
                }
                return;
            }

            try {
                const q = query(
                    collection(db, 'journals'),
                    where('userId', '==', this.userId),
                    orderBy('date', 'desc')
                );

                this.unsubscribeJournal = onSnapshot(q, (snapshot) => {
                    this.journalHistory = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            text: data.text,
                            date: data.date.toDate().toLocaleString(),
                            mood: data.mood || null,
                            moodIcon: this.getMoodIcon(data.mood),
                            isSaving: false
                        };
                    });
                    console.log(`Journal history loaded for user ${this.userId}`);
                }, (error) => {
                    console.error('Error loading journal entries:', error);
                });
            } catch (error) {
                console.error('Error subscribing to journal entries:', error);
            }
        },

        getMoodColorClass(moodLabel) {
            const moodColors = {
                'Great': 'bg-success',
                'Okay': 'bg-warning',
                'Stressed': 'bg-danger'
            };
            return moodColors[moodLabel] || 'bg-secondary';
        },

        getMoodIcon(moodLabel) {
            const moodIcons = {
                'Great': '😊',
                'Okay': '😐',
                'Stressed': '☹️'
            };
            return moodIcons[moodLabel] || '';
        },

        // Nutrition data
        async bindNutritionData() {
            if (!this.userId) {
                this.meals = [];
                this.workouts = [];
                if (this.unsubscribeMeals) {
                    this.unsubscribeMeals();
                }
                if (this.unsubscribeWorkouts) {
                    this.unsubscribeWorkouts();
                }
                return;
            }
            try {
                const today = new Date().toISOString().split('T')[0];

                if (this.unsubscribeMeals) {
                    this.unsubscribeMeals();
                }

                const mealsQuery = query(
                    collection(db, 'meals'),
                    where('userId', '==', this.userId),
                    where('date', '==', today)
                );

                this.unsubscribeMeals = onSnapshot(mealsQuery, (snapshot) => {
                    this.meals = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                });

                if (this.unsubscribeWorkouts) {
                    this.unsubscribeWorkouts();
                }

                const workoutsQuery = query(
                    collection(db, 'workouts'),
                    where('userId', '==', this.userId),
                    where('date', '==', today)
                );

                this.unsubscribeWorkouts = onSnapshot(workoutsQuery, (snapshot) => {
                    this.workouts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                });
            } catch (error) {
                console.error('Error binding nutrition data:', error);
            }
        },

        cleanupAllListeners() {
            this.userId = null;

            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }

            if (this.unsubscribeJournal) {
                this.unsubscribeJournal();
                this.unsubscribeJournal = null;
            }

            if (this.unsubscribeMeals) {
                this.unsubscribeMeals();
                this.unsubscribeMeals = null;
            }

            if (this.unsubscribeWorkouts) {
                this.unsubscribeWorkouts();
                this.unsubscribeWorkouts = null;
            }

            this.journalHistory = [];
            this.meals = [];
            this.workouts = [];
            this.events = [];
        }
    },

    async mounted() {
        // Set up authentication listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.userId = user.uid;
                console.log('User authenticated:', this.userId);
                this.isLoading = true;

                // Load module progress from Firebase
                await loadGoogleMaps();
                await this.loadModuleProgress();

                // Load recommendations from Firebase
                await this.loadCurrentStatusFromFirestore();
                await this.loadStressFactorsCount();
                await this.loadAverageSleepQuality();

                // Load today's study sessions from Firebase
                await this.loadTodayStudySessions();

                // Load nutrition data from Firebase
                await this.bindNutritionData();

                // Load journal entries
                await this.subscribeToJournalEntries();

                // Generate suggestions based on loaded data
                this.generateSuggestionsFromData();

                // Listen for real-time updates
                this.listenToEvents();
                await this.initGoogle();

                // All data loaded
                this.isLoading = false;
            } else {
                this.userId = null;
                this.modules = [];
                this.tasks = [];
                this.suggestions = [];
                this.stressFactorsCount = 0;
                this.avgSleepQuality = 0;
                this.isLoading = false;
                this.cleanupAllListeners();
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
        }
        if (this.unsubscribeJournal) {
            this.unsubscribeJournal();
            this.unsubscribeJournal = null;
        }
        if (this.unsubscribeMeals) {
            this.unsubscribeMeals();
            this.unsubscribeMeals = null;
        }
        if (this.unsubscribeWorkouts) {
            this.unsubscribeWorkouts();
            this.unsubscribeWorkouts = null;
        }
    }
}
</script>

<template>
    <div class="min-vh-100 container-color">
        <!-- Loading in progress -->
        <div v-if="isLoading" class="d-flex align-items-center justify-content-center min-vh-100">
            <div class="text-center">
                <div class="spinner-border text-white mb-3" role="status"></div>
                <p class="text-white">Preparing your dashboard...</p>
            </div>
        </div>

        <!-- Main content loaded-->
        <div v-else>
            <header>
                <div class="container px-3 py-5">
                    <h1 class="display-6 fw-bold mb-2">Welcome back!</h1>
                    <p class="fs-5 mb-0">
                        Check out your recent activity and personalised recommendations.
                    </p>
                </div>
            </header>

            <!-- Recommendation section -->
            <div class="container py-4">
                <!-- Header -->
                <h2>Your personalised recommendations</h2>
                <p>Suggestions tailored to your current schedule and wellbeing</p>

                <!-- Status cards -->
                <div class="row g-3 mb-4 justify-content-center">
                    <div class="col-6 col-md-3" v-for="(status, index, subtext) in statusList" :key="status.key">
                        <div class="card h-100" :class="getStatusCardGradient(index)">
                            <div class="card-body d-flex">
                                <div class="icon-wrap me-3">
                                    <BookOpen v-if="status.key === 'sessions'" :size="24" />
                                    <Heart v-else-if="status.key === 'stress'" :size="24" />
                                    <Activity v-else-if="status.key === 'activity'" :size="24" />
                                    <Clock v-else-if="status.key === 'sleep'" :size="24" />
                                </div>
                                <div>
                                    <div class="small text-muted">{{ status.label }}</div>
                                    <div class="fs-5 fw-semibold mt-1">{{ status.value }}</div>
                                    <div class="small text-muted">{{ status.subtext }}</div>
                                </div>
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
                                    <div class="icon-wrap me-3">
                                        <BookOpen v-if="suggestion.icon === 'BookOpen'" :size="24" />
                                        <Heart v-else-if="suggestion.icon === 'Heart'" :size="24" />
                                        <Activity v-else-if="suggestion.icon === 'Activity'" :size="24" />
                                        <Clock v-else-if="suggestion.icon === 'Clock'" :size="24" />
                                    </div>
                                    <h6 class="mb-0">{{ suggestion.title }}</h6>
                                </div>
                                
                                <!-- Description -->
                                <p class="mb-0 text-secondary">{{ suggestion.description }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- <div class="row g-4 mb-4">
                <div class="col-12 col-md-4">
                    <div class="card stat-card gradient-primary  h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="icon-wrap me-3">
                                <BookOpen :size="24" />
                            </div>
                            <div>
                                <div class="text-uppercase small fw-semibold opacity-75">Study Sessions Today</div>
                                <div class="h3 mb-0">{{ studySessionsToday }}</div>
                                <div class="small opacity-75">{{ formatStudyTime(totalStudyTimeToday) }} focused time
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-md-4">
                    <div class="card stat-card gradient-wellness  h-100">
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
                    <div class="card stat-card gradient-energy  h-100">
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
            </div> -->

                <!-- Dashboard section -->
                <div class="row g-4 my-4">
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
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
                                        <label class="small text-muted ms-2" for="weekGoogleSync"
                                            style="cursor: pointer;">
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
                        <div class="card  h-100">
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
                                                aria-valuemin="0" aria-valuemax="100"></div>
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

                    <div class="col-12 col-lg-6">
                        <div class="card  h-100">
                            <div class="card-body d-flex flex-column">
                                <h5 class="mb-3 fw-semibold d-flex align-items-center gap-2">
                                    <i class="mdi mdi-book-open-variant"></i> Recent Journal Entries
                                </h5>

                                <div v-if="!userId" class="text-center text-muted py-4">
                                    <i class="mdi mdi-lock-outline" style="font-size: 2rem; opacity: 0.3;"></i>
                                    <p class="mt-2 mb-0">Log in to load your journal history.</p>
                                </div>

                                <div v-else-if="journalHistory.length" class="d-flex flex-column gap-2 flex-grow-1">
                                    <div v-for="entry in journalHistory.slice(0, 3)" :key="entry.id"
                                        class="border rounded-2 p-3 transition-all"
                                        style="border-color: #e0e0e0; background: #fafafa;">

                                        <div class="d-flex align-items-center justify-content-between mb-2">
                                            <span class="small text-muted fw-semibold">
                                                <span v-if="entry.mood" class="me-2">{{ getMoodIcon(entry.mood)
                                                    }}</span>
                                                {{ entry.date }}
                                            </span>
                                            <span v-if="entry.mood" class="badge rounded-pill"
                                                :class="getMoodColorClass(entry.mood)"
                                                style="font-size: 0.75rem; padding: 4px 8px;">
                                                {{ entry.mood }}
                                            </span>
                                        </div>

                                        <p class="mb-0 text-secondary" style="font-size: 0.95rem; line-height: 1.4;">
                                            {{ entry.text.length > 100 ? entry.text.substring(0, 100) + '...' :
                                                entry.text
                                            }}
                                        </p>
                                    </div>
                                </div>

                                <div v-else
                                    class="text-center text-muted py-4 flex-grow-1 d-flex flex-column justify-content-center">
                                    <i class="mdi mdi-feather" style="font-size: 2rem; opacity: 0.3;"></i>
                                    <p class="mb-0 mt-2">No journal entries yet.</p>
                                    <small>Visit the Journal page to start writing!</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-body d-flex align-items-center justify-content-around">
                                <div class="text-center">
                                    <Flame class="text-primary mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalsMeals.kcal }}</div>
                                    <div class="small text-muted">Meals kcal</div>
                                </div>
                                <div class="text-center">
                                    <Activity class="text-success mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalsWorkouts.minutes }}</div>
                                    <div class="small text-muted">Workout min</div>
                                </div>
                                <div class="text-center">
                                    <TrendingUp class="text-info mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalsWorkouts.kcal }}</div>
                                    <div class="small text-muted">Burned kcal</div>
                                </div>
                                <div class="text-center">
                                    <Utensils class="text-dark mb-2" :size="24" />
                                    <div class="fw-bold">{{ netCalories }}</div>
                                    <div class="small text-muted">Net kcal</div>
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
.container {
    color: white !important;
}

.card * {
    color: black !important;
}

/* Cards */
.card {
    border-radius: 0.75rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    background-color: #f5f5f5;
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

.container-color {
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
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

.gradient-study {
    background: linear-gradient(135deg, #fff9e6 0%, #fffaf0 100%);
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

/* Loading Spinner */
.min-vh-100 {
    min-height: 100vh;
}

.spinner-border {
    width: 3rem;
    height: 3rem;
}

/* Fade in animation after load */
[v-if] {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>