<script setup>
import { BookOpen, Heart, Clock, TrendingUp, Flame, Activity, Utensils } from "lucide-vue-next";
import { collection, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadGoogleMaps } from "@/plugins/googleMaps";
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// ==================== Reactive State ====================
// Loading state
const isLoading = ref(true);
const userId = ref(null);

// Status card and suggestions initial state
const stress = ref('No data');
const sleepQuality = ref('No data');
const stressFactorsCount = ref(0);
const avgSleepQuality = ref(0);
const studySessionsToday = ref(0);
const totalStudyTimeToday = ref(0);
const suggestions = ref([]);

// Module progress initial state
const modules = ref([]);

// Google Calendar sync state
const syncEnabled = ref(false);
const accessToken = ref(null);
const syncInterval = ref(null);
const events = ref([]);
const syncErrorCount = ref(0);
const MAX_SYNC_ERRORS = 5;

// Journal initial state
const journalHistory = ref([]);

// Nutrition and fitness initial state
const meals = ref([]);
const workouts = ref([]);

// Firestore unsubscribe functions
const unsubscribeJournal = ref(null);
const unsubscribeMeals = ref(null);
const unsubscribeWorkouts = ref(null);

// Toast notification
const toast = ref(null);
const toastMessage = ref('');

// ==================== Computed Properties ====================
// Status card information
const statusList = computed(() => {
    return [
        {
            key: 'sessions',
            label: 'Study Sessions Today',
            value: studySessionsToday.value,
            subtext: `${formatStudyTime(totalStudyTimeToday.value)} focused time`
        },
        {
            key: 'stress',
            label: 'Stress Level',
            value: stress.value,
            subtext: `${stressFactorsCount.value} stress factor${stressFactorsCount.value !== 1 ? 's' : ''} identified`
        },
        {
            key: 'activity',
            label: 'Activity Minutes',
            value: `${totalWorkouts.value.minutes} min`,
            subtext: `${totalWorkouts.value.kcal} kcal burned`
        },
        {
            key: 'sleep',
            label: 'Sleep Quality',
            value: sleepQuality.value,
            subtext: `${avgSleepQuality.value} hrs average this week`
        }
    ];
});

// Events for current week grouped by day
const weekEvents = computed(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate end of week (Sunday)
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(today.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    // Filter events for current week
    const thisWeekEvents = events.value.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventEnd >= today && eventStart <= endOfWeek;
    });

    // Group events by day
    const grouped = {};

    thisWeekEvents.forEach(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        let displayDate = eventStart >= today ? eventStart : today;
        if (displayDate <= endOfWeek) {
            const dateKey = displayDate.toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    date: displayDate,
                    dayLabel: formatDayLabel(displayDate),
                    events: []
                };
            }

            const eventWithStatus = {
                ...event,
                isOngoing: eventStart < today && eventEnd >= today
            };

            grouped[dateKey].events.push(eventWithStatus);
        }
    });

    // Sort events by time and priority
    const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };

    Object.values(grouped).forEach(dayGroup => {
        dayGroup.events.sort((a, b) => {
            if (a.isOngoing && !b.isOngoing) return -1;
            if (!a.isOngoing && b.isOngoing) return 1;

            const timeCompare = new Date(a.start) - new Date(b.start);
            if (timeCompare !== 0) {
                return timeCompare;
            }
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    });

    // Convert to array and sort by date
    return Object.values(grouped).sort((a, b) => a.date - b.date);
});

// Total nutrition information
const totalMeals = computed(() => ({
    kcal: meals.value.reduce((a, m) => a + (Number(m.kcal) || 0), 0),
    protein: meals.value.reduce((a, m) => a + (Number(m.protein) || 0), 0),
    carbs: meals.value.reduce((a, m) => a + (Number(m.carbs) || 0), 0),
    fat: meals.value.reduce((a, m) => a + (Number(m.fat) || 0), 0)
}));

// Total workout statistics
const totalWorkouts = computed(() => ({
    minutes: workouts.value.reduce((a, w) => a + (Number(w.minutes) || 0), 0),
    kcal: workouts.value.reduce((a, w) => a + (Number(w.kcal) || 0), 0)
}));

// Net calories (meals - workouts)
const netCalories = computed(() => {
    return (totalMeals.value.kcal || 0) - (totalWorkouts.value.kcal || 0);
});

// ==================== Methods ====================
// Load stress level
async function loadStressLevel() {
    if (!userId.value) return;

    try {
        // Get stress level from latest mood log
        const stressQuery = query(
            collection(db, 'moodLogs'),
            where('userId', '==', userId.value),
            orderBy('date', 'desc'),
            limit(1)
        );

        const stressSnapshot = await getDocs(stressQuery);
        if (!stressSnapshot.empty) {
            const stressData = stressSnapshot.docs[0].data().stress;
            const stressValue = Number(stressData);

            // Categorise stress level
            if (stressValue < 30) {
                stress.value = 'Low';
            } else if (stressValue < 70) {
                stress.value = 'Moderate';
            } else {
                stress.value = 'High';
            }
        }

        // Extract stress factors
        const latestStressLog = stressSnapshot.docs[0].data();
        const stressFactors = latestStressLog.stressFactors || [];

        if (!Array.isArray(stressFactors)) {
            console.log('No stress factors array found');
            return;
        }

        // Store count of stress factors
        stressFactorsCount.value = stressFactors.length;

        console.log('Stress factors count:', stressFactorsCount.value, 'Factors:', stressFactors);
        console.log('Current stress loaded:', stress.value);
    } catch (error) {
        console.error('Error loading stress:', error);
    }
}

// Load sleep quality
async function loadSleepQuality() {
    if (!userId.value) return;

    try {
        // Fetch sleep logs
        const sleepQuery = query(
            collection(db, 'sleepLogs'),
            where('userId', '==', userId.value),
            orderBy('date', 'desc'),
            limit(7)
        );

        const sleepSnapshot = await getDocs(sleepQuery);
        if (sleepSnapshot.empty) {
            console.log('No sleep logs found');
            return;
        }

        // Get sleep hours
        const sleepLogs = sleepSnapshot.docs[0].data();
        const sleepDataArray = sleepLogs.sleepData || [];

        if (!Array.isArray(sleepDataArray) || sleepDataArray.length === 0) {
            console.log('No sleep data array found');
            return;
        }

        // Calculate average sleep hours
        let totalHours = 0;
        sleepDataArray.forEach(day => {
            totalHours += Number(day.hours) || 0;
        });

        const averageHours = (totalHours / sleepDataArray.length).toFixed(1);
        avgSleepQuality.value = averageHours;

        // Determine sleep quality based on average sleep hours
        const avgHoursNum = Number(averageHours);
        sleepQuality.value = avgHoursNum >= 7 ? 'Good' : avgHoursNum >= 5 ? 'Fair' : 'Poor';

        console.log('Current sleep quality:', sleepQuality.value);
        console.log('Average sleep quality this week:', avgSleepQuality.value, 'hours');
    } catch (error) {
        console.error('Error loading average sleep quality:', error);
    }
}

// Load study sessions
async function loadStudySessions() {
    if (!userId.value) return;

    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch study sessions
        const q = query(
            collection(db, 'studytimes'),
            where('userId', '==', userId.value)
        );
        const querySnapshot = await getDocs(q);

        let sessionCount = 0;
        let totalMinutes = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Convert Firebase timestamp to date
            const startTime = data.starttime?.toDate ? data.starttime.toDate() : new Date(data.starttime);

            if (startTime >= today && startTime <= todayEnd) {
                sessionCount++;

                // Calculate duration
                const endTime = data.endtime?.toDate ? data.endtime.toDate() : new Date(data.endtime);
                const durationMs = endTime - startTime;
                const durationMinutes = Math.round(durationMs / 60000);
                totalMinutes += durationMinutes;
            }
        });

        studySessionsToday.value = sessionCount;
        totalStudyTimeToday.value = totalMinutes;

        console.log(`Study sessions today: ${sessionCount}, Total time: ${totalMinutes} minutes`);
    } catch (error) {
        console.error('Error loading study sessions:', error);
    }
}

// Generate suggestions based on data
function generateSuggestionsFromData() {
    suggestions.value = [];
    const suggestionsList = [];

    // Study session suggestions
    if (studySessionsToday.value === 0) {
        suggestionsList.push({
            title: 'Start Your First Session',
            description: 'You haven\'t started studying yet today. Begin with a 25-minute Pomodoro session to build momentum.',
            icon: 'BookOpen'
        });
    } else if (studySessionsToday.value < 3) {
        suggestionsList.push({
            title: 'Keep It Up',
            description: `You've had ${studySessionsToday.value} study session${studySessionsToday.value !== 1 ? 's' : ''}. Keep the momentum going with another focused session.`,
            icon: 'BookOpen'
        });
    }

    // Break reminders
    if (totalStudyTimeToday.value >= 240) {
        suggestionsList.push({
            title: 'Take a Break',
            description: `You've been working for ${formatStudyTime(totalStudyTimeToday.value)}. Take a longer break to refresh.`,
            icon: 'BookOpen'
        });
    }

    // Workout suggestions based on activity minutes
    if (totalWorkouts.value.minutes === 0) {
        suggestionsList.push({
            title: 'Get Active',
            description: 'You haven\'t exercised today. Go for a 30 minute workout to boost your energy and burn some calories!',
            icon: 'Activity'
        });
    } else if (totalWorkouts.value.minutes < 30) {
        const remainingTime = 30 - totalWorkouts.value.minutes;
        suggestionsList.push({
            title: 'Quick Workout',
            description: `You need ${remainingTime} more minutes of exercise today. Go for a quick 5 - 10 minute session!`,
            icon: 'Activity'
        });
    } else if (totalWorkouts.value.minutes >= 30) {
        suggestionsList.push({
            title: 'Keep the Momentum',
            description: `Great job at keeping fit! You've exercised for ${totalWorkouts.value.minutes} minutes.`,
            icon: 'Activity'
        });
    }

    // Sleep quality suggestions
    if (sleepQuality.value === 'Poor') {
        suggestionsList.push({
            title: 'Improve Your Sleep',
            description: 'Your sleep quality was poor this week. Start by establishing a consistent bedtime routine.',
            icon: 'Clock'
        });
    } else if (sleepQuality.value === 'Fair') {
        suggestionsList.push({
            title: 'Optimise Your Sleep',
            description: 'Your sleep was fair this week. You can improve it by reducing screen time before bed.',
            icon: 'Clock'
        });
    } else if (sleepQuality.value === 'Good') {
        suggestionsList.push({
            title: 'Maintain Your Sleep Routine',
            description: 'Your sleep quality is excellent! Keep up your bedtime routine to maintain this positive trend.',
            icon: 'Clock'
        });
    }

    // Stress management suggestions
    if (stress.value === 'High') {
        suggestionsList.push({
            title: 'Wind Down Routine',
            description: 'Your stress level is high. Consider a relaxing activity like meditation to help you unwind before bed.',
            icon: 'Heart'
        });
    } else {
        suggestionsList.push({
            title: 'De-Stress Tips',
            description: 'To keep stress levels low, take short breaks during study sessions and talk to friends or family.',
            icon: 'Heart'
        });
    }

    suggestions.value = suggestionsList;
    console.log('Suggestions generated:', suggestions.value);
}

// Gradient colour for status cards
function getStatusCardGradient(index) {
    const gradients = [
        'gradient-primary',
        'gradient-wellness',
        'gradient-energy',
        'gradient-study'
    ];
    return gradients[index] || 'gradient-primary';
}

// Format study time to hours and minutes
function formatStudyTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
};

// Load module progress
async function loadModuleProgress() {
    if (!userId.value) return;

    try {
        // Load topics
        const q = query(collection(db, 'studydata'), where('userId', '==', userId.value));
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

        // Convert to array and calculate progress percentage
        modules.value = Object.keys(moduleStats).map(moduleName => {
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

        console.log('Module progress loaded:', modules.value);
    } catch (error) {
        console.error('Error loading module progress:', error);
    }
};

// Google Calendar sync handler
async function toggleSync() {
    if (syncEnabled.value) {
        await connectGoogle();
    } else {
        await disconnectGoogle();
    }
};

// Connect to Google Login API
async function connectGoogle() {
    if (!window.gapi || !window.google) {
        showToast('Error connecting to Google. Please try again.');
        syncEnabled.value = false;
        return;
    }

    // Check for saved Google account token
    const savedToken = sessionStorage.getItem('google_token');
    if (savedToken) {
        accessToken.value = savedToken;
        await waitForGoogleAPI();
        await syncWithGoogle();
        startAutoSync();
        return;
    }

    // Generate new Google OAuth token
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: async (response) => {
            if (response.error) {
                console.log(response.error);
                syncEnabled.value = false;
                return;
            }

            accessToken.value = response.access_token;
            sessionStorage.setItem('google_token', accessToken.value);

            await waitForGoogleAPI();
            await syncWithGoogle();
            startAutoSync();
        }
    });

    tokenClient.requestAccessToken();
};

// Disconnect from Google Login
async function disconnectGoogle() {
    if (syncInterval.value) {
        clearInterval(syncInterval.value);
    }

    sessionStorage.removeItem('google_token');
    accessToken.value = null;
};

// Auto sync with Google Calendar (Every 2 minutes)
function startAutoSync() {
    if (syncInterval.value) {
        clearInterval(syncInterval.value);
    }

    syncInterval.value = setInterval(() => {
        syncWithGoogle();
    }, 2 * 60 * 1000);
};

// Initialise Google API Client
async function initGoogle() {
    try {
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });

        await gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
        });

        console.log('Google Calendar API Initialised');
    } catch (error) {
        console.error('Error Initialising Google Calendar API:', error);
    }
};

// Sync events with Google Calendar
async function syncWithGoogle() {
    if (!accessToken.value) {
        console.log('No Access Token.');
        return;
    }

    try {
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&showDeleted=false&timeMin=' + new Date().toISOString() + '&maxResults=100',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken.value}`,
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
        events.value
            .filter(event => event.gEventId)
            .forEach(event => {
                gEventIdToDocIdMap.set(event.gEventId, event.id);
            });

        // Add/update events in Cloud Firestore
        for (const item of googleApiEvents) {
            let location = null;
            let locationName = '';

            if (item.location) {
                const parsed = await geocodeLocation(item.location);
                if (parsed) {
                    location = parsed.geopoint;
                    locationName = parsed.name;
                } else {
                    locationName = item.location;
                }
            }

            const eventData = {
                userId: userId.value,
                name: item.summary || 'Untitled Event',
                description: item.description || '',
                start: new Date(item.start.dateTime || item.start.date),
                end: new Date(item.end.dateTime || item.end.date),
                locationName: locationName,
                location: location,
                synced: true,
                gEventId: item.id
            };

            try {
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
            } catch (error) {
                console.error('Error Syncing Event from Google Calendar to Firestore:', error);
                syncErrorCount.value++;
                if (syncErrorCount.value >= MAX_SYNC_ERRORS) {
                    console.error('Maximum Sync Errors Reached. Disconnecting Google Calendar Sync.');
                    disconnectGoogle();
                }
            }
        }

        // Reset sync error count on successful sync
        syncErrorCount.value = 0;

        // Remove deleted Google Calendar events from Cloud Firestore
        const localGoogleEvents = events.value.filter(event => event.source === 'google');
        for (const localEvent of localGoogleEvents) {
            if (!googleEventIdsFromApi.has(localEvent.id)) {
                console.log(`Deleting Google Event from Cloud Firestore: ${localEvent.name} (${localEvent.id})`);
                await deleteDoc(doc(db, 'events', localEvent.id));
            }
        }

        // Add unsynced Cloud Firestore events to Google Calendar
        const eventsToPush = events.value.filter(event => event.source === 'firestore' && !event.synced);

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
                            'Authorization': `Bearer ${accessToken.value}`,
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
            } catch (error) {
                console.error(`Error Adding Event "${event.name}" to Google Calendar:`, error);
            }
        }
    } catch (error) {
        console.error('Overall Synchronisation Error:', error);
    }
};

// Wait for Google Calendar API to be ready
async function waitForGoogleAPI() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30;

        const checkAPI = () => {
            if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
                console.log('Google Calendar API is ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('Google Calendar API failed to load');
                reject(new Error('Google Calendar API timeout'));
            } else {
                console.log('Waiting for Google Calendar API...');
                attempts++;
                setTimeout(checkAPI, 1000);
            }
        };
        checkAPI();
    });
};

// Convert location string to GeoPoint
async function geocodeLocation(address) {
    try {
        const { Geocoder } = await google.maps.importLibrary("geocoding");
        const geocoder = new Geocoder();

        return new Promise((resolve) => {
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    resolve({
                        geopoint: new GeoPoint(loc.lat(), loc.lng()),
                        name: results[0].formatted_address
                    });
                } else {
                    resolve(null);
                }
            });
        });
    } catch (error) {
        return null;
    }
};

// Open Google Maps for event location
function openMap(event) {
    if (event.location) {
        const lat = event.location.latitude;
        const lng = event.location.longitude;
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else if (event.locationName) {
        const encodedAddress = encodeURIComponent(event.locationName);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
};

// Format event date (short format)
function formatShortDate(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
    });
};

// Format event time
function formatEventTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
    });
};

// Format day label (e.g., "Today", "Tomorrow", "Wed, Oct 23")
function formatDayLabel(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Today';
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
};

// Listen to Cloud Firestore events
function listenToEvents() {
    const q = query(collection(db, 'events'), where('userId', '==', userId.value));
    onSnapshot(q, (snapshot) => {
        events.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            start: doc.data().start.toDate(),
            end: doc.data().end.toDate(),
        }));
    });
};

// Get contrasting text colour for mood badge
function getContrastColor(hexColor) {
    const color = hexColor.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);

    // Return Black or White Text Colour Based on Brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
};

// Load journal entries
async function loadJournalEntries() {
    if (!userId.value) {
        journalHistory.value = [];
        if (unsubscribeJournal.value) {
            unsubscribeJournal.value();
        }
        return;
    }

    try {
        const q = query(
            collection(db, 'journals'),
            where('userId', '==', userId.value),
            orderBy('date', 'desc')
        );

        unsubscribeJournal.value = onSnapshot(q, (snapshot) => {
            journalHistory.value = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    text: data.text,
                    date: data.date.toDate().toLocaleString(),
                    mood: data.mood || null,
                    moodIcon: getMoodIcon(data.mood),
                };
            });
            console.log(`Journal history loaded for user ${userId.value}`);
        }, (error) => {
            console.error('Error loading journal entries:', error);
        });
    } catch (error) {
        console.error('Error subscribing to journal entries:', error);
    }
};

// Get mood color class for badge
function getMoodColorClass(moodLabel) {
    const moodColors = {
        'Great': 'bg-success',
        'Okay': 'bg-warning',
        'Stressed': 'bg-danger'
    };
    return moodColors[moodLabel] || 'bg-secondary';
};

// Get mood icon for journal entry
function getMoodIcon(moodLabel) {
    const moodIcons = {
        'Great': '😊',
        'Okay': '😐',
        'Stressed': '☹️'
    };
    return moodIcons[moodLabel] || '';
};

// Bind nutrition data
async function bindNutritionData() {
    if (!userId.value) {
        meals.value = [];
        workouts.value = [];
        unsubscribeMeals.value?.();
        unsubscribeWorkouts.value?.();
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        if (unsubscribeMeals.value) {
            unsubscribeMeals.value();
        }

        const mealsQuery = query(
            collection(db, 'meals'),
            where('userId', '==', userId.value),
            where('date', '==', today)
        );

        unsubscribeMeals.value = onSnapshot(mealsQuery, (snapshot) => {
            meals.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });

        if (unsubscribeWorkouts.value) {
            unsubscribeWorkouts.value();
        }

        const workoutsQuery = query(
            collection(db, 'workouts'),
            where('userId', '==', userId.value),
            where('date', '==', today)
        );

        unsubscribeWorkouts.value = onSnapshot(workoutsQuery, (snapshot) => {
            workouts.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });
    } catch (error) {
        console.error('Error binding nutrition data:', error);
    }
};

// Show toast message
function showToast(message) {
    toastMessage.value = message;

    if (toast.value) {
        const bsToast = new bootstrap.Toast(toast.value);
        bsToast.show();
    }
};

// Cleanup all listeners and data
function cleanupAllListeners() {
    if (syncInterval.value) {
        clearInterval(syncInterval.value);
        syncInterval.value = null;
    }

    [unsubscribeJournal, unsubscribeMeals, unsubscribeWorkouts].forEach(unsub => {
        unsub.value?.();
        unsub.value = null;
    });

    journalHistory.value = [];
    meals.value = [];
    workouts.value = [];
    events.value = [];
    userId.value = null;
};

// ==================== Mounted hooks ====================
onMounted(async () => {
    // Set up auth listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId.value = user.uid;
            console.log('User authenticated:', userId.value);
            isLoading.value = true;

            await Promise.all([
                loadGoogleMaps(),
                loadModuleProgress(),
                loadStressLevel(),
                loadSleepQuality(),
                loadStudySessions(),
                loadJournalEntries(),
                bindNutritionData(),
                initGoogle()
            ]);

            // Generate suggestions
            generateSuggestionsFromData();

            // Listen for real-time updates
            listenToEvents();

            // All data loaded
            isLoading.value = false;
        } else {
            // Reset all data on log out
            userId.value = null;
            modules.value = [];
            suggestions.value = [];
            stressFactorsCount.value = 0;
            avgSleepQuality.value = 0;
            isLoading.value = false;
            cleanupAllListeners();
            console.log('No user authenticated');
        }
    });

    // Check for saved Google token
    const savedToken = sessionStorage.getItem('google_token');
    if (savedToken) {
        syncEnabled.value = true;
        accessToken.value = savedToken;

        await waitForGoogleAPI();
        await syncWithGoogle();
        startAutoSync();
    }
});

// Cleanup before unmount
onBeforeUnmount(() => {
    cleanupAllListeners();
});
</script>

<template>
    <div class="min-vh-100 container-color">
        <!-- Loading in progress -->
        <div v-if="isLoading" class="loading-state d-flex align-items-center justify-content-center min-vh-100">
            <div class="text-center">
                <div class="spinner-border spinner-text mb-3" role="status"></div>
                <p class="spinner-text">Preparing your dashboard...</p>
            </div>
        </div>

        <!-- Main content loaded-->
        <div v-else>
            <header>
                <div class="container px-3 pt-4 pb-2">
                    <h1 class="display-6 fw-bold mb-2">Welcome back, {{ auth.currentUser.displayName }}!</h1>
                    <p class="fs-5 mb-0">
                        Here's an overview of your recent wellbeing and activities.
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
                    <div class="col-6 col-md-3" v-for="(status, index) in statusList" :key="status.key">
                        <div class="card h-100" :class="getStatusCardGradient(index)">
                            <div class="card-body d-flex">
                                <div class="icon-wrap icon-status me-3">
                                    <BookOpen v-if="status.key === 'sessions'" :size="24" />
                                    <Heart v-else-if="status.key === 'stress'" :size="24" />
                                    <Activity v-else-if="status.key === 'activity'" :size="24" />
                                    <Clock v-else-if="status.key === 'sleep'" :size="24" />
                                </div>
                                <div>
                                    <div class="small">{{ status.label }}</div>
                                    <div class="fs-5 fw-semibold mt-1">{{ status.value }}</div>
                                    <div class="small">{{ status.subtext }}</div>
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
                                <p class="mb-0">{{ suggestion.description }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dashboard section -->
                <!-- Header -->
                <div class="mt-5">
                    <h2>Dashboard</h2>
                    <p>Check out what's happening this week</p>
                </div>

                <!-- Dashboard content -->
                <div class="row g-4 mb-2">
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-body d-flex flex-column">
                                <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                    <h5 class="mb-0 fw-semibold d-flex align-items-center gap-2">
                                        <i class="mdi mdi-calendar-week"></i>
                                        This Week's Events
                                    </h5>

                                    <div class="ios-switch-container">
                                        <input type="checkbox" v-model="syncEnabled" id="weekGoogleSync"
                                            class="ios-switch-input" @change="toggleSync">
                                        <label class="ios-switch-label" for="weekGoogleSync">
                                            <span class="ios-switch-slider"></span>
                                        </label>
                                        <label class="small ms-2" for="weekGoogleSync" style="cursor: pointer;">
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
                                        <i class="mdi mdi-calendar-blank-outline "
                                            style="font-size: 3rem; opacity: 0.3;"></i>
                                        <p class="mt-2 mb-0">No Upcoming Events This Week</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Module progress -->
                    <div class="col-12 col-lg-6">
                        <div class="card  h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="mb-0 fw-semibold d-flex align-items-center gap-2">
                                        <TrendingUp /> Module Progress
                                    </h5>
                                </div>

                                <div v-if="modules.length > 0" class="d-flex flex-column gap-3">
                                    <div v-for="m in modules" :key="m.name">
                                        <div class="d-flex justify-content-between mb-1">
                                            <span class="small fw-semibold">{{ m.name }}</span>
                                            <span class="small">{{ m.progress }}% ({{ m.completed }}/{{
                                                m.total }})</span>
                                        </div>
                                        <div class="progress" style="height: 8px;">
                                            <div class="progress-bar" role="progressbar"
                                                :style="{ width: m.progress + '%' }" :aria-valuenow="m.progress"
                                                aria-valuemin="0" aria-valuemax="100"></div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-center py-4">
                                    <i class="mdi mdi-school-outline" style="font-size: 3rem;"></i>
                                    <p class="mb-0 mt-2">No study topics yet</p>
                                    <small>Add topics in the Study Tools page to track your progress</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Journal entries -->
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-body d-flex flex-column">
                                <h5 class="mb-3 fw-semibold d-flex align-items-center gap-2">
                                    <i class="mdi mdi-book-open-variant"></i> Recent Journal Entries
                                </h5>

                                <div v-if="!userId" class="text-center py-4">
                                    <i class="mdi mdi-lock-outline" style="font-size: 2rem; opacity: 0.3;"></i>
                                    <p class="mt-2 mb-0">Log in to load your journal history.</p>
                                </div>

                                <div v-else-if="journalHistory.length" class="d-flex flex-column gap-2 flex-grow-1">
                                    <div v-for="entry in journalHistory.slice(0, 3)" :key="entry.id"
                                        class="border rounded-2 p-3 transition-all"
                                        style="border-color: #e0e0e0; background: #fafafa;">

                                        <div class="d-flex align-items-center justify-content-between mb-2">
                                            <span class="small fw-semibold">
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

                                        <p class="mb-0" style="font-size: 0.95rem; line-height: 1.4;">
                                            {{ entry.text.length > 100 ? entry.text.substring(0, 100) + '...' :
                                                entry.text
                                            }}
                                        </p>
                                    </div>
                                </div>

                                <div v-else
                                    class="text-center py-4 flex-grow-1 d-flex flex-column justify-content-center">
                                    <i class="mdi mdi-feather" style="font-size: 2rem; opacity: 0.3;"></i>
                                    <p class="mb-0 mt-2">No journal entries yet.</p>
                                    <small>Visit the Journal page to start writing!</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Nutrition summary -->
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-body d-flex align-items-center justify-content-around">
                                <div class="text-center">
                                    <Flame class="text-primary mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalMeals.kcal }}</div>
                                    <div class="small">Meals kcal</div>
                                </div>
                                <div class="text-center">
                                    <Activity class="text-success mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalWorkouts.minutes }}</div>
                                    <div class="small">Workout min</div>
                                </div>
                                <div class="text-center">
                                    <TrendingUp class="text-info mb-2" :size="24" />
                                    <div class="fw-bold">{{ totalWorkouts.kcal }}</div>
                                    <div class="small">Burned kcal</div>
                                </div>
                                <div class="text-center">
                                    <Utensils class="text-dark mb-2" :size="24" />
                                    <div class="fw-bold">{{ netCalories }}</div>
                                    <div class="small">Net kcal</div>
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

/* Container Background */
.container-color {
    background: linear-gradient(135deg, #e5e5f2 0%, #d8d6f0 100%);
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
.icon-status svg {
    transform: translate(4px, 0);
}

/* Gradient Backgrounds */
.gradient-primary {
    background: linear-gradient(135deg, #d4e5ff 0%, #e8f4ff 100%);
}

.gradient-wellness {
    background: linear-gradient(135deg, #d0f5e8 0%, #e8fdf5 100%);
}

.gradient-energy {
    background: linear-gradient(135deg, #ffe0cc 0%, #fff3e0 100%);
}

.gradient-study {
    background: linear-gradient(135deg, #fff3cc 0%, #fff9e6 100%);
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
    inset: 0;
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

/* Spinner styling */
.spinner-border {
    width: 3rem;
    height: 3rem;
}

/* Fade in animation after load */
.loading-state {
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