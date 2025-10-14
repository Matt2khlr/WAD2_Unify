<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters style="height: 100vh;">
          <!-- Calendar Section (75%) -->
          <v-col cols="12" lg="9" class="d-flex flex-column">
            <v-card flat class="flex-grow-1 d-flex flex-column" style="height: 100%;">
              <v-card-title class="flex-shrink-0">
                <span class="text-h5">Calendar</span>
                <v-spacer></v-spacer>
                <v-btn 
                  color="primary" 
                  @click="syncWithGoogleCalendar"
                  prepend-icon="mdi-sync"
                  variant="elevated"
                >
                  Sync with Google Calendar
                </v-btn>
                &nbsp;
                <v-btn 
                  color="primary" 
                  @click="addNewEvent"
                  prepend-icon="mdi-calendar-plus"
                  variant="elevated"
                >
                  Add New Event
                </v-btn>
              </v-card-title>
              
              <v-card-text class="flex-grow-1 pa-2" style="height: 100%;">
                <v-sheet height="100%" class="d-flex flex-column">
                  <v-calendar
                    ref="calendar"
                    v-model="focus"
                    :events="allEvents"
                    type="month"
                    @click:date="addNewEvent"
                    @change="updateRange"
                    style="height: 100%;"
                  >
                    <template v-slot:event="{ event }">
                      <div 
                        @click.stop="showEventDetails(event)"
                        class="event-item"
                        :style="{ backgroundColor: event.color || event.colour }"
                      >
                        <strong>{{ event.title || event.name }}</strong>
                        <v-icon 
                          v-if="event.location" 
                          size="x-small" 
                          class="ml-1"
                        >
                          mdi-map-marker
                        </v-icon>
                      </div>
                    </template>
                  </v-calendar>
                </v-sheet>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Event List Section (25%) -->
          <v-col cols="12" lg="3" class="d-flex flex-column border-s">
            <v-card flat class="flex-grow-1 d-flex flex-column" style="height: 100vh;">
              <v-card-title class="text-h6 flex-shrink-0">
                Upcoming Events
              </v-card-title>
              <v-divider></v-divider>
              
              <v-card-text class="flex-grow-1 pa-0" style="overflow-y: auto;">
                <v-list lines="two">
                  <template v-if="sortedEventList.length === 0">
                    <v-list-item>
                      <v-list-item-title class="text-center text-grey">
                        No upcoming events
                      </v-list-item-title>
                    </v-list-item>
                  </template>
                  
                  <v-list-item
                    v-for="event in sortedEventList"
                    :key="event.id"
                    @click="showEventDetails(event)"
                    class="border-b"
                  >
                    <template v-slot:prepend>
                      <v-avatar 
                        :color="event.colour || event.color" 
                        size="12"
                      ></v-avatar>
                    </template>
                    <v-list-item-title>
                      {{ event.name }}
                      <v-icon 
                        v-if="event.location" 
                        size="small" 
                        class="ml-1"
                      >
                        mdi-map-marker
                      </v-icon>
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDateTime(event.start) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Event CRUD Dialog -->
        <v-dialog v-model="dialog" max-width="700px">
          <v-card>
            <v-card-title>
              {{ editMode ? 'Edit Event' : 'Create Event' }}
            </v-card-title>
            <v-card-text>
              <v-text-field 
                v-model="currentEvent.name" 
                label="Event Name"
                variant="outlined"
                class="mb-3"
              ></v-text-field>
              
              <v-textarea 
                v-model="currentEvent.description" 
                label="Description"
                variant="outlined"
                rows="3"
                class="mb-3"
              ></v-textarea>
              
              <v-text-field 
                v-model="currentEvent.start" 
                type="datetime-local" 
                label="Start"
                variant="outlined"
                class="mb-3"
              ></v-text-field>
              
              <v-text-field 
                v-model="currentEvent.end" 
                type="datetime-local" 
                label="End"
                variant="outlined"
                class="mb-3"
              ></v-text-field>

               <!-- Location Field with PlaceAutocompleteElement -->
                <div class="mb-3">
                  <label class="text-subtitle-2 mb-2 d-block">Location</label>
                  <div class="d-flex align-center gap-2">
                    <div class="flex-grow-1" ref="placeAutocompleteContainer">
                    </div>
                    
                    <v-btn
                      v-if="currentEvent.location"
                      icon
                      size="small"
                      color="primary"
                      @click="openGoogleMaps"
                      title="View on Google Maps"
                    >
                      📍
                    </v-btn>
                  </div>
                  <div v-if="currentEvent.location" class="text-caption text-grey mt-1">
                    📍 {{ currentEvent.locationName }}
                  </div>
                  <div v-if="currentEvent.location" class="text-caption text-grey">
                    {{ currentEvent.location.latitude.toFixed(6) }}, 
                    {{ currentEvent.location.longitude.toFixed(6) }}
                  </div>
                </div>
              
              <v-color-picker 
                v-model="currentEvent.colour"
                mode="hex"
                class="mb-3"
              ></v-color-picker>
            </v-card-text>
            
            <v-card-actions>
              <v-btn 
                v-if="editMode" 
                color="error" 
                @click="deleteEvent"
                variant="elevated"
              >
                Delete
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn @click="dialog = false" variant="text">
                Cancel
              </v-btn>
              <v-btn 
                color="primary" 
                @click="saveEvent"
                variant="elevated"
              >
                {{ editMode ? 'Update' : 'Create' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, GeoPoint } from 'firebase/firestore'
import { db } from '@/firebase'

export default {
  data() {
    return {
      focus: '',
      dialog: false,
      editMode: false,
      firestoreEvents: [],
      googleEvents: [],
      currentEvent: {
        id: null,
        name: '',
        description: '',
        start: '',
        end: '',
        colour: '#1976D2',
        location: null,
        locationName: '',
        source: null,
        googleEventId: null
      },
      userId: 'u1',
      tokenClient: null,
      accessToken: null,
      placeAutocomplete: null
    }
  },

  computed: {
    allEvents() {
      const merged = [...this.firestoreEvents, ...this.googleEvents]
      const unique = this.removeDuplicates(merged)
      
      return unique.map(event => ({
        ...event,
        title: event.name,
        color: event.colour
      }))
    },

    sortedEventList() {
      return this.allEvents
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .filter(e => new Date(e.start) >= new Date())
    }
  },

  methods: {
    // Initialise PlaceAutocompleteElement
    async initPlacesAutocomplete() {
      try {
        // Wait for Google Maps to load
        if (!window.google || !window.google.maps) {
          console.log('Waiting for Google Maps to load...')
          setTimeout(() => this.initPlacesAutocomplete(), 500)
          return
        }

        // Load Places library
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places")
        
        // Clear existing autocomplete if any
        if (this.placeAutocomplete) {
          this.placeAutocomplete.remove()
        }

        // Create new PlaceAutocompleteElement
        this.placeAutocomplete = new PlaceAutocompleteElement()

        // Append to container
        const container = this.$refs.placeAutocompleteContainer
        if (container) {
          container.innerText = '' // Clear container
          container.appendChild(this.placeAutocomplete)
        }

        this.placeAutocomplete.addEventListener('gmp-select', async (event) => {
          console.log('Place selected event fired:', event)
          
          const { placePrediction } = event
          
          if (!placePrediction) {
            console.error('No placePrediction in event')
            return
          }

          // Convert to Place object and fetch details
          const place = placePrediction.toPlace()
          
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location']
          })

          console.log('Place details:', {
            displayName: place.displayName,
            formattedAddress: place.formattedAddress,
            location: place.location
          })

          // Extract location data
          if (place.location) {
            const lat = place.location.lat()
            const lng = place.location.lng()
            
            // Create GeoPoint
            this.currentEvent.location = new GeoPoint(lat, lng)
            this.currentEvent.locationName = place.formattedAddress || place.displayName
            
            console.log('Location saved to currentEvent:', {
              name: this.currentEvent.locationName,
              lat,
              lng,
              geopoint: this.currentEvent.location
            })

            // Force Vue to update
            this.$forceUpdate()
          }
        })

        console.log('PlaceAutocompleteElement initialised successfully')
      } catch (error) {
        console.error('Error initialising PlaceAutocompleteElement:', error)
      }
    },

    // Open Google Maps with the location
    openGoogleMaps() {
      if (!this.currentEvent.location) {
        console.log('No location to open in maps')
        return
      }
      
      const { latitude, longitude } = this.currentEvent.location
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      window.open(mapsUrl, '_blank')
    },

    // Show event details for editing
    showEventDetails(event) {
      if (!event || !event.id) {
        console.error('Invalid event:', event)
        return
      }

      console.log('Showing event details:', event)

      this.editMode = true
      this.currentEvent = {
        id: event.id,
        name: event.name || event.title,
        description: event.description || '',
        start: this.formatDateTimeInput(event.start),
        end: this.formatDateTimeInput(event.end),
        colour: event.colour || event.color || '#1976D2',
        location: event.location || null,
        locationName: event.locationName || '',
        source: event.source,
        googleEventId: event.googleEventId || null
      }

      console.log('Current event location:', this.currentEvent.location)
      
      this.dialog = true
      
      // Initialize autocomplete after dialog opens
      this.$nextTick(() => {
        this.initPlacesAutocomplete()
      })
    },

    // Add new event from date click
    addNewEvent(data) {
      const date = data.date || data
      
      this.editMode = false
      this.resetForm()
      this.currentEvent.start = `${date}T09:00`
      this.currentEvent.end = `${date}T10:00`
      this.dialog = true
      
      // Initialize autocomplete after dialog opens
      this.$nextTick(() => {
        this.initPlacesAutocomplete()
      })
    },

    // Close dialog and cleanup
    closeDialog() {
      this.dialog = false
      // Clean up the autocomplete element
      if (this.placeAutocomplete) {
        this.placeAutocomplete.remove()
        this.placeAutocomplete = null
      }
    },

    // Save event with location data
    async saveEvent() {
      console.log('Saving event with location:', this.currentEvent.location)
      
      const eventData = {
        userId: this.userId,
        name: this.currentEvent.name,
        description: this.currentEvent.description,
        start: new Date(this.currentEvent.start),
        end: new Date(this.currentEvent.end),
        colour: this.currentEvent.colour,
        location: this.currentEvent.location,
        locationName: this.currentEvent.locationName || '',
        syncedToGoogle: false,
        googleEventId: null
      }

      console.log('Event data to save:', eventData)

      try {
        if (this.editMode && this.currentEvent.source === 'google') {
          console.log('Creating new Firestore document from Google Calendar event')
          
          eventData.originalGoogleEventId = this.currentEvent.googleEventId
          eventData.originalSource = 'google'
          
          const docRef = await addDoc(collection(db, 'events'), eventData)
          console.log('New document created with ID:', docRef.id)
          
          await this.updateGoogleCalendarEvent(this.currentEvent.googleEventId, eventData)
          
        } else if (this.editMode && this.currentEvent.id) {
          await updateDoc(doc(db, 'events', this.currentEvent.id), eventData)
          console.log('Firestore document updated')
          
        } else {
          const docRef = await addDoc(collection(db, 'events'), eventData)
          console.log('New event created with ID:', docRef.id)
        }
        
        this.closeDialog()
        this.resetForm()
      } catch (error) {
        console.error('Error saving event:', error)
        alert('Error saving event: ' + error.message)
      }
    },

    // Update Google Calendar event with location
    async updateGoogleCalendarEvent(googleEventId, eventData) {
      try {
        if (!this.accessToken) {
          console.log('No access token, skipping Google Calendar update')
          return
        }

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

        await gapi.client.calendar.events.patch({
          calendarId: 'primary',
          eventId: googleEventId,
          resource
        })
        
        console.log('Google Calendar event updated')
      } catch (error) {
        console.error('Error updating Google Calendar event:', error)
      }
    },

    // Parse Google Calendar location to GeoPoint using Geocoding
    async parseGoogleLocationToGeoPoint(locationString) {
      if (!locationString) return null

      try {
        const { Geocoder } = await google.maps.importLibrary("geocoding")
        const geocoder = new Geocoder()
        
        return new Promise((resolve) => {
          geocoder.geocode({ address: locationString }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const location = results[0].geometry.location
              resolve({
                geopoint: new GeoPoint(location.lat(), location.lng()),
                name: results[0].formatted_address
              })
            } else {
              console.log('Geocoding failed:', status)
              resolve(null)
            }
          })
        })
      } catch (error) {
        console.error('Error geocoding location:', error)
        return null
      }
    },

    // Delete event
    async deleteEvent() {
      try {
        if (this.currentEvent.source === 'google') {
          alert('Cannot delete Google Calendar events from this app. Please delete from Google Calendar.')
          return
        }

        await deleteDoc(doc(db, 'events', this.currentEvent.id))
        this.closeDialog()
        this.resetForm()
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    },

    // Reset form
    resetForm() {
      this.currentEvent = {
        id: null,
        name: '',
        description: '',
        start: '',
        end: '',
        colour: '#1976D2',
        location: null,
        locationName: '',
        source: null,
        googleEventId: null
      }
      this.editMode = false
    },

    // Format functions
    formatDateTime(date) {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    formatDateTimeInput(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    },

    updateRange({ start, end }) {
      console.log('Calendar range updated:', start, end)
    },

    removeDuplicates(events) {
      const seen = new Set()
      return events.filter(event => {
        const key = `${event.name}-${new Date(event.start).getTime()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },

    // Subscribe to Firestore events
    subscribeToEvents() {
      const q = query(collection(db, 'events'), where('userId', '==', this.userId))
      onSnapshot(q, (snapshot) => {
        this.firestoreEvents = snapshot.docs.map(doc => {
          const data = doc.data()
          
          console.log('Firestore event loaded:', doc.id, data)
          
          return {
            id: doc.id,
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
            source: 'firestore',
            // location is already a GeoPoint from Firestore
            location: data.location || null,
            locationName: data.locationName || ''
          }
        })
        
        console.log('All Firestore events:', this.firestoreEvents)
      })
    },

    // Google Calendar Integration (rest of the methods remain the same)
    async initGoogleCalendar() {
      await new Promise((resolve) => {
        gapi.load('client', resolve)
      })

      await gapi.client.init({
        apiKey: 'AIzaSyDyg_B2fzJsgaDO8bjyyikjVeee4AM08kI',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
      })

      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '1071880442683-199adq7lhl4k4i867qffge4gfb9ca6a8.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (response) => {
          if (response.error) {
            console.error('Error getting token:', response)
            return
          }
          this.accessToken = response.access_token
          this.fetchGoogleCalendarEvents()
        }
      })
    },

    async syncWithGoogleCalendar() {
      this.tokenClient.requestAccessToken()
    },

    async fetchGoogleCalendarEvents() {
      try {
        const response = await gapi.client.calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 100,
          orderBy: 'startTime'
        })

        const processedEvents = await Promise.all(
          response.result.items.map(async (item) => {
            let location = null
            let locationName = ''

            if (item.location) {
              const parsed = await this.parseGoogleLocationToGeoPoint(item.location)
              if (parsed) {
                location = parsed.geopoint
                locationName = parsed.name
              } else {
                locationName = item.location
              }
            }

            return {
              id: item.id,
              name: item.summary,
              description: item.description || '',
              start: new Date(item.start.dateTime || item.start.date),
              end: new Date(item.end.dateTime || item.end.date),
              colour: '#4285F4',
              source: 'google',
              googleEventId: item.id,
              location,
              locationName
            }
          })
        )

        this.googleEvents = processedEvents
        await this.syncFirestoreToGoogle()
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error)
      }
    },

    async syncFirestoreToGoogle() {
      const unsyncedEvents = this.firestoreEvents.filter(
        e => !e.syncedToGoogle && e.source === 'firestore'
      )

      for (const event of unsyncedEvents) {
        try {
          const resource = {
            summary: event.name,
            description: event.description,
            start: {
              dateTime: event.start.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: event.end.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          }

          if (event.locationName) {
            resource.location = event.locationName
          }

          const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource
          })

          await updateDoc(doc(db, 'events', event.id), {
            syncedToGoogle: true,
            googleEventId: response.result.id
          })
        } catch (error) {
          console.error('Error adding event to Google Calendar:', error)
        }
      }
    }
  },

  mounted() {
    this.subscribeToEvents()
    this.initGoogleCalendar()
  }
}
</script>

<style scoped>
/* Force full viewport usage */
.v-application {
  height: 100vh !important;
}

.v-main {
  height: 100vh !important;
}

/* Remove default container constraints */
.v-container {
  max-width: 100% !important;
  padding: 0 !important;
}

/* Make calendar cells taller */
:deep(.v-calendar-weekly__day) {
  min-height: 120px !important;
}

:deep(.v-calendar-monthly__day) {
  min-height: 120px !important;
}

/* Increase spacing in calendar */
:deep(.v-calendar-weekly__head) {
  margin-bottom: 0 !important;
}

/* Event item styling */
.event-item {
  cursor: pointer;
  padding: 0px 4px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.2s;
}

.event-item:hover {
  opacity: 0.85;
  transform: scale(1.02);
}

/* Ensure flexbox fills space */
.flex-grow-1 {
  flex-grow: 1 !important;
}

.flex-shrink-0 {
  flex-shrink: 0 !important;
}

/* Custom scrollbar for event list */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>