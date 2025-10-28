<template>
  <div class="container h-100">

    <h2 class="my-3">Calendar</h2>
    <div class="row h-100">

      <!-- Calendar Section -->
      <div class="col-lg-9 d-flex flex-column">
        <div class="card h-100 shadow-soft">
          <div class="card-header">
            <div class="d-flex align-items-center">
              
              <!-- View Type Selector -->
              <!-- <div class="btn-group text-light me-3">
                <button 
                  class="btn btn-sm"
                  :class="calendarView === 'day' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="calendarView = 'day'"
                >
                  Day
                </button>
                <button 
                  class="btn btn-sm"
                  :class="calendarView === 'week' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="calendarView = 'week'"
                >
                  Week
                </button>
                <button 
                  class="btn btn-sm"
                  :class="calendarView === 'month' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="calendarView = 'month'"
                >
                  Month
                </button>
              </div> -->

              <!-- View Selector Dropdown -->
              <div class="dropdown me-3">
                <button 
                  class="btn btn-sm view-dropdown-btn dropdown-toggle" 
                  type="button" 
                  id="viewDropdown" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  <i class="mdi mdi-calendar-month me-1"></i>
                  {{ calendarView.charAt(0).toUpperCase() + calendarView.slice(1) }}
                </button>
                <ul class="dropdown-menu dropdown-menu-styled" aria-labelledby="viewDropdown">
                  <li>
                    <a 
                      class="dropdown-item" 
                      :class="{ 'active': calendarView === 'day' }"
                      href="#" 
                      @click.prevent="calendarView = 'day'"
                    >
                      <i class="mdi mdi-calendar-today me-2"></i>
                      Day
                    </a>
                  </li>
                  <li>
                    <a 
                      class="dropdown-item" 
                      :class="{ 'active': calendarView === 'week' }"
                      href="#" 
                      @click.prevent="calendarView = 'week'"
                    >
                      <i class="mdi mdi-calendar-week me-2"></i>
                      Week
                    </a>
                  </li>
                  <li>
                    <a 
                      class="dropdown-item" 
                      :class="{ 'active': calendarView === 'month' }"
                      href="#" 
                      @click.prevent="calendarView = 'month'"
                    >
                      <i class="mdi mdi-calendar-month me-2"></i>
                      Month
                    </a>
                  </li>
                </ul>
              </div>
              
              <!-- Navigation -->
              <!-- <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary" @click="prev">
                  <i class="mdi mdi-chevron-left"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="setToday">
                  Today
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="next">
                  <i class="mdi mdi-chevron-right"></i>
                </button>
              </div> -->

              <!-- Nabigation Buttons-->
              <div class="btn-group nav-btn-group">
                <button class="btn btn-sm nav-btn" @click="prev">
                  <i class="mdi mdi-chevron-left"></i>
                </button>
                <button class="btn btn-sm nav-btn nav-btn-today" @click="setToday">
                  Today
                </button>
                <button class="btn btn-sm nav-btn" @click="next">
                  <i class="mdi mdi-chevron-right"></i>
                </button>
              </div>
              
              <!-- Current Period -->
              <span class="ms-3 text-light fw-semibold">{{ currentPeriod }}</span>
              
              <div class="ms-auto d-flex align-items-center">
                <!-- Google Calendar Sync Toggle -->
                <div class="ios-switch-container me-3">
                  <input 
                      type="checkbox" 
                      id="googleSync"
                      class="ios-switch-input"
                      v-model="syncEnabled"
                      @change="toggleSync"
                  >
                  <label class="ios-switch-label" for="googleSync">
                      <span class="ios-switch-slider"></span>
                  </label>
                  <label class="form-check-label ms-2" for="googleSync">
                    <i class="mdi mdi-google"></i> Sync with Google
                  </label>
                </div>
                
                <!-- Add Event Button -->
                <button class="btn add-event" @click="openAddDialog">
                  <i class="mdi mdi-calendar-plus"></i> Add Event
                </button>
              </div>
            </div>
          </div>
          
          <div class="card-body p-2 pb-3" style="height: 600px;">
            <v-calendar
              ref="calendar"
              v-model="focus"
              :events="allEvents"
              :type="calendarView"
              @click:time="handleClick"
              @click:day="handleClick"
              @click:date="handleClick"
              style="height: 100%;"
            >
            <template v-slot:event="{ event, timed }">
                <div 
                  @click.stop="showEventDetails(event)"
                  @mousedown.stop
                  @touchstart.stop
                  class="event-item"
                  :class="{ 'event-timed': timed }"
                  :style="{ backgroundColor: event.color, padding: '0px 5px' }"
                >
                  <!-- <strong v-if="calendarView === 'month'">{{ formatTime(event.start) }} &nbsp; {{ event.name }}</strong> -->
                  <div v-if="calendarView === 'month'">{{ formatTime(event.start) }} &nbsp;
                    <strong>{{ event.name }}</strong>
                  </div>
                  <strong v-if="(calendarView === 'week' || calendarView === 'day')">{{ event.name }}</strong>
                  <!--<i v-if="event.location" class="mdi mdi-map-marker"></i>-->
                  <div v-if="timed && (calendarView === 'week' || calendarView === 'day')" class="text-xs">
                    {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
                  </div>
                </div>
              </template>
            </v-calendar>
          </div>
        </div>
      </div>
      
      <!-- Event List - Grouped by Day -->
      <div class="col-lg-3 mt-lg-0 mt-4 mb-lg-0 mb-4">
        <div class="card h-100 mb-1 shadow-soft">
          <div class="card-header" style="padding-top: 17px; padding-bottom: 17px;">
            <h6 class="mb-0 fw-semibold">Upcoming Events</h6>
          </div>
          <div class="card-body p-3">
            <!-- Events List Grouped by Day -->
            <div class="flex-grow-1" style="overflow-y: auto; max-height: calc(100vh - 250px);">
              <div v-if="upcomingEventsByDay.length > 0" class="d-flex flex-column gap-3">
                <div v-for="(dayGroup, index) in upcomingEventsByDay" :key="index">
                  <!-- Day Header -->
                  <div class="d-flex align-items-center mb-2">
                    <span class="badge fw-medium px-2 py-1" style="font-size: 0.75rem; background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);">
                      {{ dayGroup.dayLabel }}
                    </span>
                    <div class="flex-grow-1 ms-2" style="height: 1px; background: #e0e0e0;"></div>
                  </div>

                  <!-- Events for this day -->
                  <div class="d-flex flex-column gap-2">
                    <div 
                      v-for="event in dayGroup.events" 
                      :key="event.id"
                      class="event-card py-2 px-3 rounded-2 border"
                      :style="{ backgroundColor: event.colour, color: getContrastColor(event.colour) }"
                      @click="showEventDetails(event)"
                      style="cursor: pointer;"
                    >
                      <div class="d-flex align-items-start justify-content-between gap-2">
                        <div class="flex-grow-1">
                          <!-- Event Name -->
                          <div class="fw-medium mb-1" style="font-size: 1rem; line-height: 1.3;">
                            {{ event.name }}
                          </div>
                          
                          <!-- Event Information -->
                          <div class="d-flex align-items-center gap-2 flex-wrap" style="font-size: 0.9rem;">

                            <!-- Date -->
                            <span class="d-flex align-items-center gap-1">
                            <i class="mdi mdi-calendar-blank" style="font-size: 0.9rem;"></i>
                            {{ formatShortDate(event.start) }}
                            </span>
                            
                            <!-- Time -->
                            <span class="d-flex align-items-center gap-1">
                              <i class="mdi mdi-clock-outline" style="font-size: 0.9rem;"></i>
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
                              style="font-size: 0.8rem; padding: 2px 6px;"
                            >
                              {{ event.priority }}
                            </span>
                          </div>
                        </div>

                        <!-- Google Maps Button -->
                        <button 
                          v-if="event.location || event.locationName"
                          @click.stop="openMap(event)"
                          class="map-button"
                          title="Open in Google Maps"
                          style="display: flex; margin-top: 7.5px;"
                        >
                          <i class="mdi mdi-map-marker map-icon"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="text-center py-5">
                <i class="mdi mdi-calendar-blank-outline text-muted" style="font-size: 3rem; opacity: 0.3;"></i>
                <p class="text-muted mt-2 mb-0">No Upcoming Events</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Event Dialog -->
    <div 
      class="modal fade" 
      :class="{ show: createDialog, 'd-block': createDialog }"
      tabindex="-1"
      style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create Event</h5>
            <button type="button" class="btn-close btn-close-white" @click="closeCreateDialog"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Event Name</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="currentEvent.name"
              >
            </div>
            
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea 
                class="form-control" 
                rows="3"
                v-model="currentEvent.description"
              ></textarea>
            </div>
            
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Start</label>
                <input 
                  type="datetime-local" 
                  class="form-control"
                  v-model="currentEvent.start"
                >
              </div>
              
              <div class="col-md-6 mb-3">
                <label class="form-label">End</label>
                <input 
                  type="datetime-local" 
                  class="form-control"
                  v-model="currentEvent.end"
                >
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Priority</label>
              <select class="form-select" v-model="currentEvent.priority">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Event Location</label>
              <div class="d-flex gap-2">
                <div class="flex-grow-1">
                  <input 
                    v-if="currentEvent.locationName"
                    type="text"
                    class="form-control"
                    v-model="currentEvent.locationName"
                    @click="clearAndShowAutocomplete"
                    readonly
                  >
                  <div v-else ref="placeAutocompleteContainer" class="form-control-wrapper"></div>
                </div>
                <button 
                  v-if="currentEvent.locationName"
                  class="btn btn-outline-secondary"
                  @click="clearLocation"
                  title="Clear location"
                >
                  <i class="mdi mdi-close"></i>
                </button>
              </div>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Color</label>
              <input 
                type="color" 
                class="form-control form-control-color"
                v-model="currentEvent.colour"
                style="width: 100px;"
              >
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn cancel-button" @click="closeCreateDialog">Cancel</button>
            <button class="btn save-button" @click="saveEvent">Create</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Event Dialog -->
    <div 
      class="modal fade" 
      :class="{ show: eventDialog, 'd-block': eventDialog }"
      tabindex="-1"
      style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editMode ? 'Update Event' : 'Event Details' }}</h5>
            <button type="button" class="btn-close btn-close-white" @click="closeEventDialog"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Event Name</label>
              <input
                :disabled="!editMode" 
                type="text" 
                class="form-control" 
                v-model="currentEvent.name"
              >
            </div>
            
            <div class="mb-3">
              <label class="form-label">Event Description</label>
              <textarea 
                :disabled="!editMode" 
                class="form-control" 
                rows="3"
                v-model="currentEvent.description"
              ></textarea>
            </div>
            
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Start</label>
                <input 
                  :disabled="!editMode" 
                  type="datetime-local" 
                  class="form-control"
                  v-model="currentEvent.start"
                >
              </div>
              
              <div class="col-md-6 mb-3">
                <label class="form-label">Event End</label>
                <input 
                  :disabled="!editMode" 
                  type="datetime-local" 
                  class="form-control"
                  v-model="currentEvent.end"
                >
              </div>
            </div>
            
            <div class="mb-3" v-if="!editMode">
              <label class="form-label">Event Priority</label>
              <input 
                  :disabled="!editMode" 
                  type="text" 
                  class="form-control"
                  v-model="currentEvent.priority"
              >
            </div>

            <div class="mb-3" v-if="editMode">
              <label class="form-label">Event Priority</label>
              <select class="form-select" v-model="currentEvent.priority">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label class="form-label" v-if="editMode">Event Location</label>
              <div class="d-flex gap-2" v-if="editMode">
                <div class="flex-grow-1">
                  <input 
                    v-if="currentEvent.locationName"
                    type="text"
                    class="form-control"
                    v-model="currentEvent.locationName"
                    @click="clearAndShowAutocomplete"
                    readonly
                  >
                  <div v-else ref="placeAutocompleteContainer"></div>
                </div>
                <button 
                  v-if="currentEvent.locationName"
                  class="btn close-button"
                  @click="clearLocation"
                  title="Clear Location"
                >
                  <i class="mdi mdi-close"></i>
                </button>
              </div>
              <div v-if="!editMode">
                <label class="form-label" v-if="currentEvent.location">Event Location</label>
                <div v-if="currentEvent.location" class="text">
                  📍 {{ currentEvent.locationName }}&nbsp;&nbsp;
                  <button 
                    @click.stop="openMap(event)"
                    class="map-button"
                    title="Open in Google Maps"
                  >
                    <i class="mdi mdi-map-marker map-icon"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="mb-3" v-if="editMode">
              <label class="form-label">Event Colour</label>
              <input 
                :disabled="!editMode"
                type="color" 
                class="form-control form-control-color"
                v-model="currentEvent.colour"
                style="width: 100px;"
              >
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn cancel-button" @click="deleteEvent">Delete</button>
            <button class="btn save-button" @click="switchToUpdateMode" v-if="!editMode">Update</button>
            <button class="btn save-button" @click="saveEvent" v-if="editMode">Save</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';

export default {
  data() {
    return {
      focus: new Date(),
      calendarView: 'month',
      createDialog: false,
      eventDialog: false,
      editMode: false,
      events: [],
      currentEvent: {
        id: null,
        name: '',
        description: '',
        start: '',
        end: '',
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: '',
        source: 'firestore',
        synced: false,
        gEventId: null
      },
      //userId: auth.currentUser?.uid,
      userId: 'u1',
      syncEnabled: false,
      accessToken: null,
      syncInterval: null,
      placeAutocomplete: null,
      showAutocomplete: false
    }
  },

  setup() {
    const router = useRouter()
    return { router }
  },

  computed: {
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

    // sortedEvents() {
    //   const now = new Date()
    //   const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }
      
    //   // Filter Events
    //   return this.events
    //     .filter(event => new Date(event.start) >= now)
    //     .sort((a, b) => {
    //       // Sort by Event Date
    //       const dateCompare = new Date(a.start) - new Date(b.start);
    //       if (dateCompare !== 0) {
    //         return dateCompare;
    //       };

    //       // Sort by Event Priority Level
    //       return priorityOrder[a.priority] - priorityOrder[b.priority];
    //     })
    // },

    upcomingEventsByDay() {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Filter Upcoming Events
      const upcomingEvents = this.events.filter(event => {
        const eventDate = new Date(event.start)
        return eventDate >= today
      })

      // Group Events by Day
      const grouped = {}
      
      upcomingEvents.forEach(event => {
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

      // Sort Events by Time and Priority Level
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }
      
      Object.values(grouped).forEach(dayGroup => {
        dayGroup.events.sort((a, b) => {
          const timeCompare = new Date(a.start) - new Date(b.start)
          if (timeCompare !== 0) return timeCompare
          return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999)
        })
      })

      // Convert to Array and Sort by Date
      return Object.values(grouped)
        .sort((a, b) => a.date - b.date)
        //.slice(0, 30)
    },
        
    currentPeriod() {
      const date = new Date(this.focus)
      
      if (this.calendarView === 'day') {
        return date.toLocaleDateString('en-UK', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      } else if (this.calendarView === 'week') {
        // Calculate Week Start and End
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        return `${weekStart.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-UK', { month: 'short', day: 'numeric', year: 'numeric' })}`
      } else {
        return date.toLocaleDateString('en-UK', {
          month: 'long',
          year: 'numeric'
        })
      }
    }
  },

  methods: {
    // Navigate to Today
    setToday() {
      this.focus = new Date()
    },

    // Navigate to Previous Period
    prev() {
      const date = new Date(this.focus)
      
      if (this.calendarView === 'day') {
        date.setDate(date.getDate() - 1)
      } else if (this.calendarView === 'week') {
        date.setDate(date.getDate() - 7)
      } else {
        date.setMonth(date.getMonth() - 1)
      }
      
      this.focus = date
    },

    // Navigate to Next Period
    next() {
      const date = new Date(this.focus)
      
      if (this.calendarView === 'day') {
        date.setDate(date.getDate() + 1)
      } else if (this.calendarView === 'week') {
        date.setDate(date.getDate() + 7)
      } else {
        date.setMonth(date.getMonth() + 1)
      }
      
      this.focus = date
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

    // Open Add Event Dialog
    openAddDialog(data) {

      const date = new Date();
      date.setHours(date.getHours() + 8)
      const startUnix = this.roundTime(date.getTime(), false);
      const startTS = new Date(startUnix).toISOString().substring(0, 16);
      date.setHours(date.getHours() + 1)
      const endUnix = this.roundTime(date.getTime(), false);
      const endTS = new Date(endUnix).toISOString().substring(0, 16);
      
      this.editMode = false
      this.currentEvent = {
        id: null,
        name: '',
        description: '',
        start: `${startTS}`,
        end: `${endTS}`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore'
      }
      this.createDialog = true
      
      this.$nextTick(() => {
        this.setupPlacesAutocomplete();
      })
    },

    // Open Add Event Dialog
    handleClick(data, tms) {

      const date = new Date().toISOString().split('T')[0]
      
      this.editMode = false
      if (this.calendarView === 'month') {
        
        const startTS = new Date(this.getStart(tms)).toISOString().substring(0, 10);
        const endTS = new Date(this.getEnd(tms)).toISOString().substring(0, 10);

        this.currentEvent = {
        id: null,
        name: '',
        description: '',
        start: `${startTS}T09:00`,
        end: `${endTS}T10:00`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore'
        }
      }
      else {

        const startUnix = this.roundTime(this.getStart(tms), false);
        const startTS = new Date(startUnix).toISOString().substring(0, 16);
        const endUnix = this.roundTime(this.getEnd(tms), false);
        const endTS = new Date(endUnix).toISOString().substring(0, 16);

        this.currentEvent = {
        id: null,
        name: '',
        description: '',
        start: `${startTS}`,
        end: `${endTS}`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore'
        }
      }
      this.createDialog = true
      
      this.$nextTick(() => {
        this.setupPlacesAutocomplete();
      })
    },

    getStart (tms) {
      return new Date(tms.year, tms.month - 1, tms.day, tms.hour + 8, tms.minute).getTime();
    },

    getEnd (tms) {
      return new Date(tms.year, tms.month - 1, tms.day, tms.hour + 9, tms.minute).getTime();
    },

    roundTime (time, down = true) {
      const roundTo = 15 // minutes
      const roundDownTime = roundTo * 60 * 1000

      return down
        ? time - time % roundDownTime
        : time + (roundDownTime - (time % roundDownTime))
    },

    // Show Events Details in Event Dialog
    showEventDetails(event) {
      const fullEvent = this.events.find(e => e.id === event.id)
      
      if (!fullEvent) {
        console.error('Event Not Found:', event.id)
        return
      }
      
      this.currentEvent = {
        id: fullEvent.id,
        name: fullEvent.name,
        description: fullEvent.description,
        start: this.formatForInput(fullEvent.start),
        end: this.formatForInput(fullEvent.end),
        colour: fullEvent.colour,
        priority: fullEvent.priority || 'Low',
        location: fullEvent.location,
        locationName: fullEvent.locationName,
        source: fullEvent.source,
        synced: fullEvent.synced,
        gEventId: fullEvent.gEventId
      }
      
      this.eventDialog = true
    },

    // Switch to Update Mode in Event Dialog
    switchToUpdateMode() {
      this.editMode = true;
      this.$nextTick(() => {
        this.setupPlacesAutocomplete()
      })
    },

    // Close Create Dialog
    closeCreateDialog() {
      this.createDialog = false;
      if (this.placeAutocomplete) {
        this.placeAutocomplete.remove();
        this.placeAutocomplete = null;
      }
    },

    // Close Event Dialog
    closeEventDialog() {
      this.eventDialog = false;
      this.editMode = false;
      if (this.placeAutocomplete) {
        this.placeAutocomplete.remove();
        this.placeAutocomplete = null;
      }
    },

    // Create or Update Event
    async saveEvent() {
      const startDate = new Date(this.currentEvent.start).getTime()
      const endDate = new Date(this.currentEvent.end).getTime()

      if (startDate >= endDate) {
        alert('End Date Earlier than Start Date')
        return
      }

      const eventData = {
        userId: this.userId,
        name: this.currentEvent.name,
        description: this.currentEvent.description,
        start: new Date(this.currentEvent.start),
        end: new Date(this.currentEvent.end),
        colour: this.currentEvent.colour,
        priority: this.currentEvent.priority,
        location: this.currentEvent.location,
        locationName: this.currentEvent.locationName,
        source: this.currentEvent.source
      }

      try {
        if (this.editMode) {
          // Update Event in Cloud Firestore
          await updateDoc(doc(db, 'events', this.currentEvent.id), eventData)
          
          // Update Event in Google Calendar (Syncing)
          if (this.syncEnabled && this.currentEvent.gEventId) {
            await this.updateInGoogle(this.currentEvent.gEventId, eventData)
          }
        } else {
          // Create New Event in Cloud Firestore
          eventData.synced = false
          eventData.gEventId = null
          
          const docRef = await addDoc(collection(db, 'events'), eventData)
          
          // Create New Event in Google Calendar (Syncing)
          if (this.syncEnabled && this.accessToken) {
            const googleEventId = await this.addToGoogle(eventData)
            if (googleEventId) {
              await updateDoc(doc(db, 'events', docRef.id), {
                synced: true,
                gEventId: googleEventId
              })
            }
          }
        }
        
        if (this.editMode) {
          this.closeEventDialog()
        } else {
          this.closeCreateDialog()
        }
        this.editMode = false
      } catch (error) {
        alert('Error Saving Event: ' + error.message)
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

    // Delete Event
    async deleteEvent() {
      if (!confirm('Are you sure you want to delete this Event?')) return;
      
      try {
        if (this.syncEnabled && this.currentEvent.gEventId) {
          try {
            await gapi.client.calendar.events.delete({
              calendarId: 'primary',
              eventId: this.currentEvent.gEventId
            });
            console.log('Event Deleted from Google Calendar.');
          } 
          catch (error) {
            console.log('Error Deleting Event from Google Calendar:', error);
          }
        }
        
        // Delete Event from Cloud Firestore
        await deleteDoc(doc(db, 'events', this.currentEvent.id));
        
        this.closeEventDialog();
      } 
      catch (error) {
        alert('Error Deleting Event: ' + error.message);
      }
    },

    // Clear Current Event Location in Event Dialog
    clearLocation() {
      this.currentEvent.location = null
      this.currentEvent.locationName = ''
      this.showAutocomplete = true
      
      this.$nextTick(() => {
        this.setupPlacesAutocomplete()
      })
    },

    //Initialise Google Places API
    async setupPlacesAutocomplete() {
      if (!window.google?.maps || this.currentEvent.location) {
        return
      }

      try {
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places")
        
        if (this.placeAutocomplete) {
          this.placeAutocomplete.remove()
        }

        this.placeAutocomplete = new PlaceAutocompleteElement()

        const container = this.$refs.placeAutocompleteContainer
        if (container) {
          container.innerHTML = ''
          container.appendChild(this.placeAutocomplete)
        }

        this.placeAutocomplete.addEventListener('gmp-select', async (event) => {
          const place = event.placePrediction.toPlace()
          
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location']
          })

          if (place.location) {
            this.currentEvent.location = new GeoPoint(
              place.location.lat(),
              place.location.lng()
            )
            this.currentEvent.locationName =  place.displayName + ", " + place.formattedAddress
            this.showAutocomplete = false
            
            if (this.placeAutocomplete) {
              this.placeAutocomplete.remove()
              this.placeAutocomplete = null
            }
          }
        })
      } catch (err) {
        console.error('Error Retrieving Places:', err)
      }
    },

    // Open Google Maps
    openMap(event) {
      if (!event.location) return
      
      const lat = event.location.latitude
      const lng = event.location.longitude
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    },

    // Format Date for Display
    formatDateTime(date) {
      return new Date(date).toLocaleString('en-UK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    // Format Time for Display
    formatTime(date) {
      return new Date(date).toLocaleTimeString('en-UK', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

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
        hour: '2-digit',
        minute: '2-digit',
        })
    },

    getContrastColor(hexColor) {
      const color = hexColor.replace('#', '')
      const r = parseInt(color.substr(0, 2), 16)
      const g = parseInt(color.substr(2, 2), 16)
      const b = parseInt(color.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      return brightness > 128 ? '#000000' : '#ffffff'
    },

    // Format Date for Cloud Firestore
    formatForInput(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    },

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
    },

    //Check Authentication Status
    // checkAuth() {
    //   onAuthStateChanged(auth, (user) => {
    //     if (user) {
    //       // User is signed in
    //       this.userId = user.uid
          
    //       // Start listening to events after we have user ID
    //       this.listenToEvents()
    //     } 
    //     else {
    //       this.router.push('/login')
    //     }
    //   })
    // },
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
}
</script>

<style scoped>
.card-header {
  background: #667eea;
	color: white;
}

.event-item:hover {
  opacity: 0.85;
}

.modal.show {
  display: block !important;
}

/* Month View */
:deep(.v-calendar-monthly__day) {
  min-height: 120px !important;
}

/* Week View */
:deep(.v-calendar-weekly__day) {
  min-height: 100px !important;
}

:deep(.v-calendar-weekly__head) {
  margin-bottom: 0 !important;
}

/* Day View */
:deep(.v-calendar-daily__day) {
  min-height: 50px !important;
}

:deep(.v-calendar-weekly .event-item),
:deep(.v-calendar-daily .event-item) {
  padding: 4px 6px;
  margin: 2px 0;
  white-space: normal;
  line-height: 1.3;
}

.btn-group .btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.shadow-soft {
    box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
}

.form-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

/* CSS for Add Event Button */
.add-event {
  border-radius: 20px;
  background-color: white;
  color: #667eea;
}

.add-event:hover {
  color: #764ba2;
}

/* Cards */
.card {
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Card Hover Effect */
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
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
.ios-switch-input:checked + .ios-switch-label .ios-switch-slider {
  background: #5BC236;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

/* Checked State - Move Knob */
.ios-switch-input:checked + .ios-switch-label .ios-switch-slider::before {
  transform: translateX(18px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

/* Hover Effect */
.ios-switch-label:hover .ios-switch-slider {
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* Active/Pressed Effect */
.ios-switch-input:active + .ios-switch-label .ios-switch-slider::before {
  width: 24px;
}

/* Focus State */
.ios-switch-input:focus + .ios-switch-label .ios-switch-slider {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

/* Disabled State */
.ios-switch-input:disabled + .ios-switch-label {
  opacity: 0.5;
  cursor: not-allowed;
}

/* CSS for Map Button */
.map-button {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
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
  border: 1px solid lightgray;
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

/* CSS for Dropdown Button */
.view-dropdown-btn {
  background-color: white;
  color:#667eea;
  border: 1.5px solid white;
  padding: 0.4rem 1rem;
  font-weight: 500;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.view-dropdown-btn:hover {
  background: white;
  color: #764ba2;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

/* Dropdown Menu */
.dropdown-menu-styled {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem;
  min-width: 140px;
}

.dropdown-menu-styled .dropdown-item {
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.dropdown-menu-styled .dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-menu-styled .dropdown-item.active {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* CSS for Button Group */
.nav-btn-group {
  border-radius: 20px;
  background: white;
  padding: 3px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn {
  background: transparent;
  color: #667eea;
  border: none;
  padding: 0.375rem 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.nav-btn:hover {
  background: #f3f4f6;
  color: #764ba2;
}

/* CSS for Dialogs */
.modal-header {
  background: #667eea;
	color: white;
}

.modal input {
  border: 1px solid black;
  border-radius: 3px;
  height: 50px;
}

.modal textarea {
  border: 1px solid black;
  border-radius: 3px;
}

.modal select {
  border: 1px solid black;
  border-radius: 3px;
  height: 50px;
}

.save-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.save-button:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid lightgray;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.cancel-button {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.cancel-button:hover {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid lightgray;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.close-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  border: 1px solid black;
  border-radius: 3px;
  color: white;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid black;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

</style>