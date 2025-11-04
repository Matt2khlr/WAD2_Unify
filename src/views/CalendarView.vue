<template>
  <div class="container h-100">

    <div class="mt-2 mb-2 text-center">
      <h1 class="display-4 fw-bold d-flex align-items-center gap-3">
        Calendar
      </h1>
    </div>
    
    <div class="row h-100">

      <!-- Calendar Section -->
      <div class="col-lg-9 d-flex flex-column">
        <div class="card h-100 shadow-soft">
          <div class="card-header">
            <div class="d-flex align-items-center">

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

              <!-- Navigation Buttons-->
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
                  <div v-if="calendarView === 'month'">
                    <i v-if="event.isRecurring" class="mdi mdi-repeat" style="font-size: 0.7rem;"></i>
                    {{ formatTime(event.start) }} &nbsp;
                    <strong>{{ event.name }}</strong>
                  </div>
                  <div v-if="(calendarView === 'week' || calendarView === 'day')">
                    <strong>
                      <i v-if="event.isRecurring" class="mdi mdi-repeat me-1"></i>
                      {{ event.name }}
                    </strong>
                  </div>
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
                            <i v-if="event.isRecurring" class="mdi mdi-repeat me-1"></i>
                            {{ event.name }}
                          </div>
                          
                          <!-- Event Information -->
                          <div class="d-flex align-items-center gap-2 flex-wrap" style="font-size: 0.8rem;">

                            <!-- Date -->
                            <span class="d-flex align-items-center gap-1">
                            <i class="mdi mdi-calendar-blank" style="font-size: 0.8rem;"></i>
                            {{ formatShortDate(event.start) }}
                            </span>
                            
                            <!-- Time -->
                            <span class="d-flex align-items-center gap-1">
                              <i class="mdi mdi-clock-outline" style="font-size: 0.8rem;"></i>
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
            <h5 class="modal-title">
              <i class="mdi mdi-calendar-plus me-2"></i>
              Create Event</h5>
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

            <!-- Recurring Event Toggle -->
            <div class="mb-3">
              <div class="ios-switch-container">
                <input 
                  type="checkbox" 
                  id="recurringSwitch"
                  class="ios-switch-input"
                  v-model="currentEvent.isRecurring"
                  @change="toggleRecurring"
                >
                <label class="ios-switch-label" for="recurringSwitch">
                  <span class="ios-switch-slider"></span>
                </label>
                <label class="form-check-label ms-2" for="recurringSwitch">
                  <i class="mdi mdi-repeat"></i> Recurring Event
                </label>
              </div>
            </div>

            <!-- Recurrence Settings -->
            <div v-if="currentEvent.isRecurring" class="mb-3 p-3" style="background: #f8f9fa; border-radius: 8px;">
              <div class="mb-3">
                <label class="form-label">Repeat</label>
                <select class="form-select" v-model="currentEvent.recurrence.frequency">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <!-- Weekly Options -->
              <div v-if="currentEvent.recurrence.frequency === 'WEEKLY'" class="mb-3">
                <label class="form-label">Repeats Every</label>
                <div class="d-flex gap-2">
                  <button
                    v-for="day in weekDays"
                    :key="day.value"
                    type="button"
                    class="btn btn-sm"
                    :class="currentEvent.recurrence.byWeekDay.includes(day.value) ? 'day-btn-selected' : 'day-btn'"
                    @click="toggleWeekDay(day.value)"
                  >
                    {{ day.label }}
                  </button>
                </div>
              </div>

              <!-- Monthly Options -->
              <div v-if="currentEvent.recurrence.frequency === 'MONTHLY'" class="mb-3">
                <label class="form-label">Monthly Repeat Type</label>
                <select class="form-select" v-model="currentEvent.recurrence.monthlyType">
                  <option value="dayOfMonth">On Day {{ getDayOfMonth() }} of Each Month</option>
                  <option value="dayOfWeek">On {{ getOrdinal() }} {{ getDayName() }} of Each Month</option>
                </select>
              </div>

              <!-- End Options -->
              <div class="mb-3">
                <label class="form-label">Ends</label>
                <select class="form-select mb-2" v-model="currentEvent.recurrence.endType">
                  <option value="never">Never</option>
                  <option value="on">On Specific Date</option>
                  <option value="after">After Nunber of Instances</option>
                </select>

                <!-- End Date -->
                <input 
                  v-if="currentEvent.recurrence.endType === 'on'"
                  type="date" 
                  class="form-control mt-2"
                  v-model="currentEvent.recurrence.endDate"
                >

                <!-- Count -->
                <input 
                  v-if="currentEvent.recurrence.endType === 'after'"
                  type="number" 
                  class="form-control mt-2"
                  v-model.number="currentEvent.recurrence.count"
                  min="1"
                  placeholder="Number of Instances"
                >
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Priority</label>
                <select class="form-select" v-model="currentEvent.priority">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Category</label>
                <select class="form-select" v-model="currentEvent.category">
                  <option value="Class">Class</option>
                  <option value="Exam">Exam</option>
                  <option value="Assignment">Assignment</option>
                  <option value="CCA">CCA</option>
                  <option value="Work">Work</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Family">Family</option>
                  <option value="Friends">Friends</option>
                  <option value="Travel">Travel</option>
                  <option value="Others">Others</option>
                </select>
              </div>
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
                  class="btn close-button"
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
            <h5 class="modal-title">
              <i v-if="currentEvent.isRecurring" class="mdi mdi-repeat me-2"></i>
              {{ editMode ? 'Update Event' : 'Event Details' }}
            </h5>
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

            <!-- Recurrence Information (View Mode) -->
            <div v-if="currentEvent.isRecurring && !editMode" class="mb-3">
              <label class="form-label">
                <i class="mdi mdi-repeat me-1"></i>Recurrence Pattern
              </label>
              <p class="mb-0">{{ getRecurrenceDescription() }}</p>
            </div>

           <!-- Recurrence Information (Edit Mode) -->
            <div v-if="currentEvent.isRecurring && editMode" class="mb-3">
              <div class="ios-switch-container">
                <input 
                  type="checkbox" 
                  id="recurringEditSwitch"
                  class="ios-switch-input"
                  v-model="currentEvent.isRecurring"
                  @change="toggleRecurring"
                >
                <label class="ios-switch-label" for="recurringEditSwitch">
                  <span class="ios-switch-slider"></span>
                </label>
                <label class="form-check-label ms-2" for="recurringEditSwitch">
                  <i class="mdi mdi-repeat"></i> Recurring Event
                </label>
              </div>
            </div>

            <!-- Recurrence Settings in Edit Mode -->
            <div v-if="currentEvent.isRecurring && editMode" class="mb-3 p-3" style="background: #f8f9fa; border-radius: 8px;">
              <div class="mb-3">
                <label class="form-label">Repeat</label>
                <select class="form-select" v-model="currentEvent.recurrence.frequency">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <!-- Weekly Options -->
              <div v-if="currentEvent.recurrence.frequency === 'WEEKLY'" class="mb-3">
                <label class="form-label">Repeats Every</label>
                <div class="d-flex gap-2">
                  <button
                    v-for="day in weekDays"
                    :key="day.value"
                    type="button"
                    class="btn btn-sm"
                    :class="currentEvent.recurrence.byWeekDay.includes(day.value) ? 'day-btn-selected' : 'day-btn'"
                    @click="toggleWeekDay(day.value)"
                  >
                    {{ day.label }}
                  </button>
                </div>
              </div>

              <!-- Monthly Options -->
              <div v-if="currentEvent.recurrence.frequency === 'MONTHLY'" class="mb-3">
                <label class="form-label">Monthly Repeat Type</label>
                <select class="form-select" v-model="currentEvent.recurrence.monthlyType">
                  <option value="dayOfMonth">On day {{ getDayOfMonth() }} of Each Month</option>
                  <option value="dayOfWeek">On the {{ getOrdinal() }} {{ getDayName() }} of Each Month</option>
                </select>
              </div>

              <!-- End Options -->
              <div class="mb-3">
                <label class="form-label">Ends</label>
                <select class="form-select mb-2" v-model="currentEvent.recurrence.endType">
                  <option value="never">Never</option>
                  <option value="on">On Specific Date</option>
                  <option value="after">After Number of Instances</option>
                </select>

                <!-- End Date -->
                <input 
                  v-if="currentEvent.recurrence.endType === 'on'"
                  type="date" 
                  class="form-control mt-2"
                  v-model="currentEvent.recurrence.endDate"
                >

                <!-- Count -->
                <input 
                  v-if="currentEvent.recurrence.endType === 'after'"
                  type="number" 
                  class="form-control mt-2"
                  v-model.number="currentEvent.recurrence.count"
                  min="1"
                  placeholder="Number of Instances"
                >
              </div>
            </div>

            <div class="row" v-if="!editMode">
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Priority</label>
                <input 
                    :disabled="!editMode" 
                    type="text" 
                    class="form-control"
                    v-model="currentEvent.priority"
                >
              </div>
              
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Category</label>
                <input 
                    :disabled="!editMode" 
                    type="text" 
                    class="form-control"
                    v-model="currentEvent.category"
                >
              </div>
            </div>

            <div class="row" v-if="editMode">
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Priority</label>
                <select class="form-select" v-model="currentEvent.priority">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div class="col-md-6 mb-3">
                <label class="form-label">Event Category</label>
                <select class="form-select" v-model="currentEvent.category">
                  <option value="Class">Class</option>
                  <option value="Exam">Exam</option>
                  <option value="Assignment">Assignment</option>
                  <option value="CCA">CCA</option>
                  <option value="Work">Work</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Family">Family</option>
                  <option value="Friends">Friends</option>
                  <option value="Travel">Travel</option>
                  <option value="Others">Others</option>
                </select>
              </div>
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
                    @click.stop="openMap(currentEvent)"
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
            <button 
              class="btn cancel-button" 
              @click="deleteEvent"
            >
              Delete
            </button>
            <button class="btn save-button" @click="switchToUpdateMode" v-if="!editMode">Update</button>
            <button class="btn save-button" @click="saveEvent" v-if="editMode">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div 
      class="modal fade" 
      :class="{ show: deleteConfirmDialog, 'd-block': deleteConfirmDialog }"
      tabindex="-1"
      style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="mdi mdi-alert-circle-outline me-2"></i>
              Confirm Delete
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="closeDeleteConfirm"></button>
          </div>
          <div class="modal-body">
            <p v-if="currentEvent.isRecurring" class="mb-0">
              <i class="mdi mdi-repeat me-2"></i>
              This is a recurring event. Deleting it will remove <strong>all instances</strong>. Are you sure you want to continue?
            </p>
            <p v-else class="mb-0">
              Are you sure you want to delete the event <strong>{{ currentEvent.name }}</strong>?
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn save-button" @click="closeDeleteConfirm">
              Cancel
            </button>
            <button class="btn cancel-button" @click="confirmDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- General Dialog -->
    <div 
      class="modal fade" 
      :class="{ show: generalDialog, 'd-block': generalDialog }"
      tabindex="-1"
      style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="mdi mdi-message-alert-outline me-2"></i>
              Message
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="closeGeneralDialog"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0">
              {{dialogMessage}}
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn cancel-button" @click="closeGeneralDialog">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div
      ref="toast"
      class="toast position-fixed bottom-0 start-50 translate-middle-x m-3"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-bs-delay="3000"
    >
      <div class="toast-body">
        {{ toastMessage }}
      </div>
    </div>

  </div>
</template>

<script>
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, onSnapshot, GeoPoint } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { loadGoogleMaps } from '@/plugins/googleMaps';

export default {
  data() {
    return {
      focus: new Date(),
      calendarView: 'month',
      createDialog: false,
      eventDialog: false,
      deleteConfirmDialog: false,
      generalDialog: false,
      toastMessage: '',
      dialogMessage: '',
      editMode: false,
      events: [],
      currentEvent: {
        id: null,
        name: '',
        description: '',
        category: 'Class',
        start: '',
        end: '',
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: '',
        source: 'firestore',
        synced: false,
        gEventId: null,
        isRecurring: false,
        recurrence: {
          frequency: 'WEEKLY',
          byWeekDay: [],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        },
        recurrenceRule: null,
        recurringEventId: null,
        instanceDate: null
      },
      userId: auth.currentUser?.uid,
      syncEnabled: false,
      accessToken: null,
      syncInterval: null,
      placeAutocomplete: null,
      showAutocomplete: false,
      weekDays: [
        { label: 'Sun', value: 'SU' },
        { label: 'Mon', value: 'MO' },
        { label: 'Tue', value: 'TU' },
        { label: 'Wed', value: 'WE' },
        { label: 'Thu', value: 'TH' },
        { label: 'Fri', value: 'FR' },
        { label: 'Sat', value: 'SA' }
      ]
    }
  },

  computed: {
    allEvents() {
      const expandedEvents = [];
      
      for (const event of this.events) {
        if (event.isRecurring && event.recurrenceRule) {
          // Expand Recurring Events
          const instances = this.expandRecurringEvent(event);
          expandedEvents.push(...instances);
        } else {
          // Add Non-Recurring Events
          expandedEvents.push({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
            title: event.name,
            color: event.colour,
            timed: true
          });
        }
      }
      
      return expandedEvents;
    },

    upcomingEventsByDay() {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Filter Upcoming and Ongoing Events
      const upcomingEvents = this.allEvents.filter(event => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return eventEnd >= today
      })

      // Group Events by Day
      const grouped = {}
      
      upcomingEvents.forEach(event => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        
        // Group Ongoing Events under Today
        let displayDate = eventStart >= today ? eventStart : today
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
      })

      // Sort Events by Time and Priority Level
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 }
      
      Object.values(grouped).forEach(dayGroup => {
        dayGroup.events.sort((a, b) => {
          if (a.isOngoing && !b.isOngoing) return -1
          if (!a.isOngoing && b.isOngoing) return 1
          
          const timeCompare = new Date(a.start) - new Date(b.start)
          if (timeCompare !== 0) return timeCompare
          return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999)
        })
      })

      // Convert to Array and Sort by Date
      return Object.values(grouped)
        .sort((a, b) => a.date - b.date)
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

    // Show Toast
    showToast(message) {
      this.toastMessage = message;
      let toastEl = this.$refs.toast;
      let toast = new bootstrap.Toast(toastEl);
      toast.show();
    },

    // Toggle Recurring Event
    toggleRecurring() {
      if (this.currentEvent.isRecurring) {
        // Initialize Recurrence Defaults (Based on Start Date)
        const startDate = new Date(this.currentEvent.start);
        const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startDate.getDay()];
        
        this.currentEvent.recurrence = {
          frequency: 'WEEKLY',
          byWeekDay: [dayOfWeek],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        };
      }
    },

    // Toggle Week Day Selection
    toggleWeekDay(day) {
      const index = this.currentEvent.recurrence.byWeekDay.indexOf(day);
      if (index > -1) {
        this.currentEvent.recurrence.byWeekDay.splice(index, 1);
      } else {
        this.currentEvent.recurrence.byWeekDay.push(day);
      }
    },

    // Get Day of Month from Start Date
    getDayOfMonth() {
      if (!this.currentEvent.start) return '';
      return new Date(this.currentEvent.start).getDate();
    },

    // Get Ordinal
    getOrdinal() {
      if (!this.currentEvent.start) return '';
      const date = new Date(this.currentEvent.start);
      const dayOfMonth = date.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);
      
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
      return ordinals[weekOfMonth - 1] || 'last';
    },

    // Get Day Name
    getDayName() {
      if (!this.currentEvent.start) return '';
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date(this.currentEvent.start).getDay()];
    },

    // Generate RRULE String
    buildRRule() {
      const rec = this.currentEvent.recurrence;
      let rrule = `FREQ=${rec.frequency}`;

      if (rec.frequency === 'WEEKLY' && rec.byWeekDay.length > 0) {
        rrule += `;BYDAY=${rec.byWeekDay.join(',')}`;
      }

      if (rec.frequency === 'MONTHLY') {
        if (rec.monthlyType === 'dayOfMonth') {
          const day = this.getDayOfMonth();
          rrule += `;BYMONTHDAY=${day}`;
        } else {
          const weekOfMonth = Math.ceil(new Date(this.currentEvent.start).getDate() / 7);
          const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date(this.currentEvent.start).getDay()];
          rrule += `;BYDAY=${weekOfMonth}${dayOfWeek}`;
        }
      }

      if (rec.endType === 'on' && rec.endDate) {
        // Format as YYYYMMDD
        const endDate = new Date(rec.endDate);
        const formatted = endDate.toISOString().split('T')[0].replace(/-/g, '');
        rrule += `;UNTIL=${formatted}T235959Z`;
      } else if (rec.endType === 'after' && rec.count) {
        rrule += `;COUNT=${rec.count}`;
      }

      return rrule;
    },

    // Parse RRULE String
    parseRRule(rruleString) {
      const recurrence = {
        frequency: 'WEEKLY',
        byWeekDay: [],
        monthlyType: 'dayOfMonth',
        endType: 'never',
        endDate: null,
        count: null
      };

      if (!rruleString) return recurrence;

      const parts = rruleString.split(';');
      
      parts.forEach(part => {
        const [key, value] = part.split('=');
        
        switch(key) {
          case 'FREQ':
            recurrence.frequency = value;
            break;
          case 'BYDAY':
            if (recurrence.frequency === 'WEEKLY') {
              recurrence.byWeekDay = value.split(',');
            } else if (recurrence.frequency === 'MONTHLY') {
              recurrence.monthlyType = 'dayOfWeek';
            }
            break;
          case 'BYMONTHDAY':
            recurrence.monthlyType = 'dayOfMonth';
            break;
          case 'UNTIL':
            recurrence.endType = 'on';
            // Parse YYYYMMDD format
            const year = value.substring(0, 4);
            const month = value.substring(4, 6);
            const day = value.substring(6, 8);
            recurrence.endDate = `${year}-${month}-${day}`;
            break;
          case 'COUNT':
            recurrence.endType = 'after';
            recurrence.count = parseInt(value);
            break;
        }
      });

      return recurrence;
    },

    // Set Recurrence Description for Event Dialog
    getRecurrenceDescription() {
      if (!this.currentEvent.isRecurring || !this.currentEvent.recurrence) {
        return '';
      }

      const rec = this.currentEvent.recurrence;
      let description = '';

      switch(rec.frequency) {
        case 'DAILY':
          description = 'Daily';
          break;
        case 'WEEKLY':
          if (rec.byWeekDay.length > 0) {
            const dayNames = rec.byWeekDay.map(d => {
              const day = this.weekDays.find(wd => wd.value === d);
              return day ? day.label : d;
            });
            description = `Weekly on ${dayNames.join(', ')}`;
          } else {
            description = 'Weekly';
          }
          break;
        case 'MONTHLY':
          if (rec.monthlyType === 'dayOfMonth') {
            description = `Monthly on day ${this.getDayOfMonth()}`;
          } else {
            description = `Monthly on the ${this.getOrdinal()} ${this.getDayName()}`;
          }
          break;
        case 'YEARLY':
          description = `Yearly on ${new Date(this.currentEvent.start).toLocaleDateString('en-UK', { day: 'numeric', month: 'long' })}`;
          break;
      }

      if (rec.endType === 'on' && rec.endDate) {
        description += `, until ${new Date(rec.endDate).toLocaleDateString('en-UK', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
      } else if (rec.endType === 'after' && rec.count) {
        description += `, ${rec.count} times`;
      }

      return description;
    },

    // Expand Recurring Events into Individual Instances
    expandRecurringEvent(event) {
      const instances = [];
      const rrule = event.recurrenceRule;
      
      if (!rrule) return instances;

      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const duration = endDate - startDate;

      // Parse Recurrence Rule
      const rec = this.parseRRule(rrule);
      
      // Calculate Visible Date Range (1 Year from Focus Date)
      const rangeStart = new Date(this.focus);
      rangeStart.setMonth(rangeStart.getMonth() - 6);
      const rangeEnd = new Date(this.focus);
      rangeEnd.setMonth(rangeEnd.getMonth() + 12);

      let currentDate = new Date(startDate);
      let count = 0;
      const maxCount = rec.count || 730;

      // Check End Date
      let endLimit = null;
      if (rec.endType === 'on' && rec.endDate) {
        endLimit = new Date(rec.endDate);
        endLimit.setHours(23, 59, 59, 999);
      }

      while (count < maxCount && currentDate <= rangeEnd) {
        // Check if End Date has been past
        if (endLimit && currentDate > endLimit) {
          break;
        } 

        let includeInstance = false;

        if (rec.frequency === 'DAILY') {
          includeInstance = true;
        } else if (rec.frequency === 'WEEKLY') {
          // Get Current Day of Week in RRULE format
          const currentDayCode = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][currentDate.getDay()];
          
          if (rec.byWeekDay.length === 0 || rec.byWeekDay.includes(currentDayCode)) {
            includeInstance = true;
          }
        } else if (rec.frequency === 'MONTHLY') {
          if (rec.monthlyType === 'dayOfMonth') {
            if (currentDate.getDate() === startDate.getDate()) {
              includeInstance = true;
            }
          } else {
            // Get Day of Week
            const startWeekOfMonth = Math.ceil(startDate.getDate() / 7);
            const currentWeek = Math.ceil(currentDate.getDate() / 7);
            if (currentWeek === startWeekOfMonth && currentDate.getDay() === startDate.getDay()) {
              includeInstance = true;
            }
          }
        } else if (rec.frequency === 'YEARLY') {
          if (currentDate.getMonth() === startDate.getMonth() && 
              currentDate.getDate() === startDate.getDate()) {
            includeInstance = true;
          }
        }

        // Add Instance to Array (if in Visible Range)
        if (includeInstance && currentDate >= rangeStart && currentDate <= rangeEnd) {
          const instanceStart = new Date(currentDate);
          const instanceEnd = new Date(instanceStart.getTime() + duration);

          instances.push({
            ...event,
            id: `${event.id}_${instanceStart.getTime()}`,
            start: instanceStart,
            end: instanceEnd,
            title: event.name,
            color: event.colour,
            timed: true,
            recurringEventId: event.id,
            instanceDate: instanceStart.toISOString()
          });

          count++;
          if (rec.endType === 'after' && count >= rec.count) break;
        }

        // Advance to Next Day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Prevent Loops
        if (currentDate > rangeEnd) {
          break
        };
      }

      return instances;
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
        this.showToast('Error Connecting to Google Account Login. Please Try Again.');
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
      console.log("Disconnected from Google Calendar API.")
    },

    // Auto Sync with Google Calendar
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
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const response = await gapi.client.calendar.events.list({
          calendarId: 'primary',
          timeMin: twoWeeksAgo.toISOString(),
          showDeleted: false,
          singleEvents: false,
          maxResults: 200
        });

        const googleApiEvents = response.result.items || [];
        
        // Extract Base Event IDs (from Direct Events and recurringEventId references)
        const baseRecurringEventIds = new Set();
        const googleEventIdsFromApi = new Set();
        
        for (const item of googleApiEvents) {
          if (item.recurringEventId) {
            // Only Recurring Event Instances have recurringEventID field
            baseRecurringEventIds.add(item.recurringEventId);
          } else {
            // Base Event of Recurring Event or Single Event
            googleEventIdsFromApi.add(item.id);
            if (item.recurrence) {
              baseRecurringEventIds.add(item.id);
            }
          }
        }

        const gEventIdToDocIdMap = new Map();
        this.events
          .filter(event => event.gEventId)
          .forEach(event => {
            gEventIdToDocIdMap.set(event.gEventId, event.id);
          });

        // Process Base Events
        for (const item of googleApiEvents) {
          // Skip Instances
          if (item.recurringEventId) {
            console.log(`Skipping Instance ${item.id} (Belongs to ${item.recurringEventId})`);
            continue;
          }
          
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

          // Handle Recurring Events
          let isRecurring = false;
          let recurrenceRule = null;
          
          if (item.recurrence && item.recurrence.length > 0) {
            isRecurring = true;
            // Extract RRULE from Recurrence Array
            const rruleLine = item.recurrence.find(r => r.startsWith('RRULE:'));
            if (rruleLine) {
              recurrenceRule = rruleLine.replace('RRULE:', '');
            }
          }

          const eventData = {
            userId: this.userId,
            name: item.summary || 'Untitled Event',
            description: item.description || '',
            category: 'Google Calendar',
            start: new Date(item.start.dateTime || item.start.date),
            end: new Date(item.end.dateTime || item.end.date),
            locationName: locationName,
            location: location,
            synced: true,
            gEventId: item.id,
            isRecurring: isRecurring,
            recurrenceRule: recurrenceRule
          };

          if (gEventIdToDocIdMap.has(item.id)) {
            // Update existing Firestore document
            const firestoreDocId = gEventIdToDocIdMap.get(item.id);
            console.log(`Updating Firestore Event ${firestoreDocId} with Google Calendar Event ${item.id}`);
            await updateDoc(doc(db, 'events', firestoreDocId), eventData);
          } 
          else {
            // Create new Firestore document with Google Calendar Event ID as Document ID
            eventData.colour = '#9FE1E7';
            eventData.source = 'google';
            eventData.priority = 'Low';
            console.log(`Creating New Firestore Document for Google Calendar Event ${item.id}`);
            await setDoc(doc(db, 'events', item.id), eventData);
          }
        }

        // Delete Events from Google Calendar
        const localGoogleEvents = this.events.filter(event => event.source === 'google');
        for (const localEvent of localGoogleEvents) {
          const shouldDelete = !googleEventIdsFromApi.has(localEvent.id) && !baseRecurringEventIds.has(localEvent.id);
          
          if (shouldDelete) {
            console.log(`Deleting Google Event from Cloud Firestore: ${localEvent.name} (${localEvent.id})`);
            await deleteDoc(doc(db, 'events', localEvent.id));
          } else {
            console.log(`Keeping Event ${localEvent.id} (Found in Google Calendar)`);
          }
        }

        // Add unsynced Cloud Firestore Events to Google Calendar
        const eventsToPush = this.events.filter(event => event.source === 'firestore' && !event.synced);
        
        for (const event of eventsToPush) {
          try {
            const resource = {
              summary: event.name,
              description: event.description,
              start: { 
                dateTime: new Date(event.start).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              end: { 
                dateTime: new Date(event.end).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              location: event.locationName || ''
            };

            // Add Recurrence Rules for Recurring Events
            if (event.isRecurring && event.recurrenceRule) {
              resource.recurrence = [`RRULE:${event.recurrenceRule}`];
            }

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
        checkAPI();
      })
    },

    // Convert Location to GeoPoint
    async geocodeLocation(address) {
      try {
        const { PlacesService } = await google.maps.importLibrary("places");
        const { Geocoder } = await google.maps.importLibrary("geocoding");
        
        const geocoder = new Geocoder();
        
        return new Promise((resolve) => {
          // Geocode Location
          geocoder.geocode({ address: address }, async (results, status) => {
            if (status === 'OK' && results[0]) {
              const loc = results[0].geometry.location;
              let displayName = address;
              
              // Get Place Details
              if (results[0].place_id) {
                try {
                  const service = new PlacesService(document.createElement('div'));
                  
                  service.getDetails(
                    { placeId: results[0].place_id },
                    (place, placeStatus) => {
                      if (placeStatus === 'OK' && place) {
                        displayName = place.name 
                          ? `${place.name}, ${place.formatted_address}`
                          : place.formatted_address || address;
                      } 
                      else {
                        displayName = address;
                      }
                      
                      resolve({
                        geopoint: new GeoPoint(loc.lat(), loc.lng()),
                        name: displayName
                      });
                    }
                  );
                } 
                catch (err) {
                  resolve({
                    geopoint: new GeoPoint(loc.lat(), loc.lng()),
                    name: address
                  });
                }
              } 
              else {
                resolve({
                  geopoint: new GeoPoint(loc.lat(), loc.lng()),
                  name: address
                });
              }
            } 
            else {
              resolve(null);
            }
          });
        });
      } 
      catch (err) {
        return null;
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
        category: 'Class',
        start: `${startTS}`,
        end: `${endTS}`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore',
        isRecurring: false,
        recurrence: {
          frequency: 'WEEKLY',
          byWeekDay: [],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        },
        recurrenceRule: null
      }
      this.createDialog = true
      
      this.$nextTick(() => {
        this.setupPlacesAutocomplete();
      })
    },

    // Handle Click on Calendar
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
        category: 'Class',
        start: `${startTS}T09:00`,
        end: `${endTS}T10:00`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore',
        isRecurring: false,
        recurrence: {
          frequency: 'WEEKLY',
          byWeekDay: [],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        },
        recurrenceRule: null
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
        category: 'Class',
        start: `${startTS}`,
        end: `${endTS}`,
        colour: '#667EEA',
        priority: 'Low',
        location: null,
        locationName: null,
        source: 'firestore',
        isRecurring: false,
        recurrence: {
          frequency: 'WEEKLY',
          byWeekDay: [],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        },
        recurrenceRule: null
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
      const roundTo = 15 //Minutes
      const roundDownTime = roundTo * 60 * 1000

      return down
        ? time - time % roundDownTime
        : time + (roundDownTime - (time % roundDownTime))
    },

    // Show Events Details in Event Dialog
    showEventDetails(event) {
      let fullEvent;
      
      // Check if Recurring Event
      if (event.recurringEventId) {
        fullEvent = this.events.find(e => e.id === event.recurringEventId);
        if (fullEvent) {
          this.currentEvent.instanceDate = event.instanceDate;
        }
      } else {
        fullEvent = this.events.find(e => e.id === event.id);
      }
      
      if (!fullEvent) {
        console.error('Event Not Found:', event.id);
        return;
      }
      
      this.currentEvent = {
        id: fullEvent.id,
        name: fullEvent.name,
        description: fullEvent.description,
        category: fullEvent.category,
        start: this.formatForInput(event.start),
        end: this.formatForInput(event.end),
        colour: fullEvent.colour,
        priority: fullEvent.priority || 'Low',
        location: fullEvent.location,
        locationName: fullEvent.locationName,
        source: fullEvent.source,
        synced: fullEvent.synced,
        gEventId: fullEvent.gEventId,
        isRecurring: fullEvent.isRecurring || false,
        recurrence: fullEvent.recurrenceRule ? this.parseRRule(fullEvent.recurrenceRule) : {
          frequency: 'WEEKLY',
          byWeekDay: [],
          monthlyType: 'dayOfMonth',
          endType: 'never',
          endDate: null,
          count: null
        },
        recurrenceRule: fullEvent.recurrenceRule,
        recurringEventId: event.recurringEventId || null,
        instanceDate: event.instanceDate || null
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
      const startDate = new Date(this.currentEvent.start).getTime();
      const endDate = new Date(this.currentEvent.end).getTime();

      if (startDate >= endDate) {
        this.dialogMessage = 'End Date Earlier than Start Date!';
        this.generalDialog = true;
        return
      }

      const eventData = {
        userId: this.userId,
        name: this.currentEvent.name,
        description: this.currentEvent.description,
        category: this.currentEvent.category,
        start: new Date(this.currentEvent.start),
        end: new Date(this.currentEvent.end),
        colour: this.currentEvent.colour,
        priority: this.currentEvent.priority,
        location: this.currentEvent.location,
        locationName: this.currentEvent.locationName,
        source: this.currentEvent.source,
        isRecurring: this.currentEvent.isRecurring
      }

      // Add recurrence rule if recurring
      if (this.currentEvent.isRecurring) {
        eventData.recurrenceRule = this.buildRRule();
      } else {
        eventData.recurrenceRule = null;
      }

      try {
        if (this.editMode) {
          // Update Event in Cloud Firestore
          await updateDoc(doc(db, 'events', this.currentEvent.id), eventData);
          
          // Update Event in Google Calendar (Syncing)
          if (this.syncEnabled && this.currentEvent.gEventId) {
            await this.updateInGoogle(this.currentEvent.gEventId, eventData);
          }
        } else {
          // Create New Event in Cloud Firestore
          eventData.synced = false
          eventData.gEventId = null
          
          const docRef = await addDoc(collection(db, 'events'), eventData);
          
          // Create New Event in Google Calendar (Syncing)
          if (this.syncEnabled && this.accessToken) {
            const googleEventId = await this.addToGoogle(eventData);
            if (googleEventId) {
              await updateDoc(doc(db, 'events', docRef.id), {
                synced: true,
                gEventId: googleEventId
              })
            }
          }
        }
        
        if (this.editMode) {
          this.closeEventDialog();
        } else {
          this.closeCreateDialog();
        }
        this.editMode = false;
        this.showToast(this.editMode ? 'Event Updated Successfully!' : 'Event Created Successfully!');
      } catch (error) {
        //alert('Error Saving Event: ' + error.message);
        this.showToast('Error Saving Event. Please Try Again.');
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

        // Add recurrence rule
        if (eventData.isRecurring && eventData.recurrenceRule) {
          resource.recurrence = [`RRULE:${eventData.recurrenceRule}`];
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

        // Add recurrence rule
        if (eventData.isRecurring && eventData.recurrenceRule) {
          resource.recurrence = [`RRULE:${eventData.recurrenceRule}`];
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

    // Delete Event Confirmation
    async deleteEvent() {
      if (this.currentEvent.isRecurring) {
        // Recurring Event
        if (!confirm('This is a recurring event. Deleting it will remove all instances. Are you sure?')) {
          return;
        };
      } else {
        // Single Event
        if (!confirm('Are you sure you want to delete this event?')) {
          return;
        }
      }

      await this.performDelete();
    },

    // Close General Dialog
    closeGeneralDialog() {
      this.generalDialog = false;
      this.dialogMessage = '';
    },

    // Show Delete Confirmation Dialog
    async deleteEvent() {
      this.deleteConfirmDialog = true;
    },

    // Close Delete Confirmation Dialog
    closeDeleteConfirm() {
      this.deleteConfirmDialog = false;
    },

    // Confirm and Perform Delete
    async confirmDelete() {
      this.closeDeleteConfirm();
      await this.performDelete();
    },

    // Backend Deletion
    async performDelete() {
      try {
        // Delete from Google Calendar
        if (this.syncEnabled && this.currentEvent.gEventId) {
          try {
            await gapi.client.calendar.events.delete({
              calendarId: 'primary',
              eventId: this.currentEvent.gEventId
            });
            console.log('Event deleted from Google Calendar.');
          } catch (error) {
            console.error('Error deleting event from Google Calendar:', error);
          }
        }
        
        // Delete from Cloud Firestore
        await deleteDoc(doc(db, 'events', this.currentEvent.id));
        console.log('Event deleted from Firestore.');
        
        this.closeEventDialog();
        this.showToast('Event deleted successfully', 'success'); // Optional: Add toast notification
      } catch (error) {
        this.showToast('Error deleting event: ' + error.message, 'error'); // Optional: Add toast notification
        console.error('Error deleting event:', error);
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

    // Initialise Google Places API
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
          container.innerText = ''
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
  },

  async mounted() {
    await loadGoogleMaps()
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
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  border: 1px solid black;
  border-radius: 3px;
  color: white;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid black;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

/* CSS for Recurrence Button */
.day-btn {
  width: 45px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid black;
  border-radius: 20px;
  background: white;
}

.day-btn-selected {
  width: 45px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid black;
  border-radius: 20px;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.toast {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
}

</style>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: auto;
}
</style>