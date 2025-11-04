<script setup>
import { ref, onMounted } from 'vue'; 
import { db, auth } from '@/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, where, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import * as bootstrap from 'bootstrap'; 

const userId = ref(null); 
const journalEntry = ref('');
const journalHistory = ref([]); 
const editingEntry = ref(null); 

// TOAST/MODAL STATE
const toast = ref(null);
const toastMessage = ref('');
const generalDialog = ref(false);
const dialogMessage = ref('');
const dialogConfirmAction = ref(null); 

// MOOD TRACKING STATE AND LOGIC
const moodOptions = [
  { label: "Great", color: "bg-success", icon: "😊" },
  { label: "Okay", color: "bg-warning", icon: "😐" },
  { label: "Stressed", color: "bg-danger", icon: "☹️" },
];
const selectedMood = ref(null);

function selectMood(label) {
  selectedMood.value = label;
}

function getMoodColorClass(moodLabel) {
    const option = moodOptions.find(o => o.label === moodLabel);
    return option ? option.color : 'bg-secondary';
}

function getMoodIcon(moodLabel) {
    const option = moodOptions.find(o => o.label === moodLabel);
    return option ? option.icon : '';
}

// DIALOG FUNCTIONS
function showToast(message) {
  toastMessage.value = message;
  let toastEl = toast.value;
  let toastBs = new bootstrap.Toast(toastEl);
  toastBs.show();
}

function openGeneralDialog(message, confirmAction = null) {
  dialogMessage.value = message;
  dialogConfirmAction.value = confirmAction;
  generalDialog.value = true;
}

function closeGeneralDialog() {
  generalDialog.value = false;
  dialogConfirmAction.value = null;
}

function executeDialogAction() {
    if (dialogConfirmAction.value) {
        dialogConfirmAction.value();
    }
    closeGeneralDialog();
}


// FIREBASE READ FUNCTION
function subscribeToJournalEntries() {
    if (!userId.value) return; 

    const q = query(
        collection(db, 'journals'), 
        where('userId', '==', userId.value), 
        orderBy('date', 'desc') 
    );

    onSnapshot(q, (snapshot) => {
        const fetchedEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
                id: doc.id, 
                text: data.text,
                date: data.date.toDate().toLocaleString(),
                mood: data.mood || null, 
                moodIcon: getMoodIcon(data.mood), 
                isSaving: false 
            }
        });
        
        journalHistory.value = fetchedEntries;
        console.log(`Journal history for user ${userId.value} updated from Firestore.`);
    });
}


// Saves new entry
async function saveEntry() {
  const user = auth.currentUser;
  if (!user) {
      showToast('You must be logged in to save a journal entry.');
      return;
  }
  
  if (!journalEntry.value.trim()) {
    showToast('Please write something before saving.');
    return;
  }
  
  if (!selectedMood.value) {
      showToast('Please select a mood before saving your journal entry.');
      return; 
  }

  const newEntryData = {
      userId: user.uid, 
      text: journalEntry.value.trim(),
      date: new Date(), 
      mood: selectedMood.value, 
  };
  
  const optimisticEntry = {
      id: Date.now(), 
      text: newEntryData.text,
      date: newEntryData.date.toLocaleString(), 
      mood: selectedMood.value, 
      moodIcon: getMoodIcon(selectedMood.value), 
      isSaving: true 
  };

  journalHistory.value.unshift(optimisticEntry);
  
  const moodToReset = selectedMood.value;
  journalEntry.value = ''; 
  selectedMood.value = null; 

  try {
      await addDoc(collection(db, 'journals'), newEntryData);
      showToast('Journal entry saved to the cloud!');
      
  } catch (error) {
      console.error("Error saving journal entry:", error);
      showToast('Error: Failed to save journal entry.');
      
      journalHistory.value = journalHistory.value.filter(e => e.id !== optimisticEntry.id);
      selectedMood.value = moodToReset;
  }
}

// EDITING AND DELETION FUNCTIONS

// 1. Opens the editing form
function openEditDialog(entry) {
    // Create a copy so we modify the local copy, not the bound array directly
    editingEntry.value = { ...entry };
}

// 2. Saves the edited entry to Firestore
async function saveEditedEntry(entry) {
    if (!editingEntry.value || !editingEntry.value.id || !entry.text.trim()) return;
    
    try {
        const entryRef = doc(db, 'journals', editingEntry.value.id);
        
        const updatedData = {
            text: entry.text.trim(),
            mood: entry.mood,
        };

        await updateDoc(entryRef, updatedData);
        
        // Success: Close the editing state. onSnapshot updates the list.
        editingEntry.value = null;
        showToast('Entry successfully updated!');
        
    } catch (error) {
        console.error("Error updating entry:", error);
        showToast('Error: Failed to save changes.');
    }
}

// 3. Deletes the entry from Firestore (Uses new Modal for confirmation)
function deleteJournalEntry(id) {
    openGeneralDialog(
        "Are you sure you want to permanently delete this journal entry? This action cannot be undone.", 
        () => executeDelete(id)
    );
}

// Helper function to execute the Firebase delete
async function executeDelete(id) {
    try {
        const entryRef = doc(db, 'journals', id);
        await deleteDoc(entryRef);
        showToast('Entry successfully deleted.');
        
    } catch (error) {
        console.error("Error deleting entry:", error);
        showToast('Error: Failed to delete the journal entry.');
    }
}


onMounted(() => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId.value = user.uid; 
            subscribeToJournalEntries(); 
        } else {
            userId.value = null;
            journalHistory.value = []; 
        }
    });
});
</script>

<template>
  <div class="min-vh-100 bg-gradient p-5">
    <div class="container">
      <div class="mb-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          <i class="bi bi-journal-text"></i> Journal
        </h1>
        <p class="text-muted fs-5">Log your thoughts and reflections to manage your wellness.</p>
      </div>
      
      <div class="card bg-primary text-white shadow mb-4 p-4">
        <h2 class="mb-4">How are you feeling today?</h2>
        <div class="d-flex justify-content-center gap-4 mb-3">
          <button 
            v-for="option in moodOptions" 
            :key="option.label" 
            :class="['d-flex flex-column align-items-center p-3 rounded', option.color, { 'opacity-75': selectedMood !== option.label }]"
            style="width: 100px; transition: transform 0.3s;"
            @click="selectMood(option.label)"
            :style="{ transform: selectedMood === option.label ? 'scale(1.05)' : 'scale(1)' }"
          >
            <span class="fs-1">{{ option.icon }}</span>
            <span class="mt-2 fw-semibold">{{ option.label }}</span>
          </button>
        </div>
        <p class="text-center text-white-75">Track your mood daily to identify patterns and improve wellbeing</p>
      </div>

      <div class="p-4 shadow rounded bg-light mb-5">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-pencil-square"></i> New Journal Entry
        </h3>
        <textarea 
          class="form-control" 
          rows="6" 
          placeholder="Write about your day, your focus, or any stress you're feeling..."
          v-model="journalEntry"
          @keyup.enter="saveEntry" ></textarea>
        <button class="btn btn-primary mt-3" @click="saveEntry">Save Journal Entry</button>
      </div>
      
      <div class="p-4 shadow rounded bg-light mb-4">
          <h3 class="h5 mb-3 d-flex align-items-center gap-2">
            <i class="bi bi-book me-2"></i> Recent Entries
          </h3>
          
          <div v-if="!userId" class="text-center text-muted py-3">
             <i class="bi bi-lock fa-2x mb-2"></i>
             <p>Log in to load your journal history.</p>
          </div>
          <div v-else-if="journalHistory.length">
              <div 
                v-for="entry in journalHistory" 
                :key="entry.id" 
                class="card card-body mb-2 p-3"
                :class="{'opacity-75 bg-light-subtle': entry.isSaving}"
              >
              
                  <div v-if="editingEntry && editingEntry.id === entry.id">
                      <h5 class="fw-bold mb-2">Editing Entry ({{ entry.date }})</h5>
                      <textarea v-model="editingEntry.text" class="form-control mb-3" rows="4"></textarea>
                      
                      <div class="d-flex gap-2 mb-3 align-items-center">
                        <span class="fw-semibold me-2">Mood:</span>
                        <button 
                            v-for="option in moodOptions" 
                            :key="option.label" 
                            :class="['btn btn-sm', editingEntry.mood === option.label ? option.color : 'btn-outline-secondary']"
                            @click="editingEntry.mood = option.label"
                        >
                            {{ option.icon }} {{ option.label }}
                        </button>
                      </div>

                      <div class="d-flex justify-content-end">
                          <button class="btn btn-sm btn-secondary me-2" @click="editingEntry = null">Cancel</button>
                          <button class="btn btn-sm btn-success" @click="saveEditedEntry(editingEntry)">Save Changes</button>
                      </div>
                  </div>
                  
                  <div v-else>
                      <div class="d-flex justify-content-between align-items-start mb-2">
                          <span class="small text-muted d-block fw-semibold">
                              <span v-if="entry.moodIcon" class="me-2">{{ entry.moodIcon }}</span>
                              {{ entry.date }} 
                              <i v-if="entry.isSaving" class="bi bi-cloud-arrow-up-fill text-warning ms-2"></i>
                          </span>

                          <div class="action-buttons" role="group" v-if="!entry.isSaving">
                              <button 
                                  type="button" 
                                  class="btn btn-sm action-edit me-2"
                                  @click="openEditDialog(entry)"
                              >
                                  <i class="bi bi-pencil"></i> Edit
                              </button>
                              <button 
                                  type="button" 
                                  class="btn btn-sm action-delete"
                                  @click="deleteJournalEntry(entry.id)"
                              >
                                  <i class="bi bi-trash"></i> Delete
                              </button>
                          </div>
                      </div>
                      
                      <p class="mb-0">{{ entry.text }}</p>
                      <span v-if="entry.mood" class="badge rounded-pill mt-2 align-self-start" :class="getMoodColorClass(entry.mood)">
                          {{ entry.mood }}
                      </span>
                  </div>
              </div>
          </div>
          <div v-else class="text-muted fst-italic">
            <i class="bi bi-feather me-2" style="opacity: 0.5;"></i>
            No entries saved yet. Start by writing your first journal entry above!
          </div>
      </div>

    </div>
    
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
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Confirmation
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
              Cancel
            </button>
            <button class="btn save-button" @click="executeDialogAction">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* TOAST STYLING */
.toast {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* MODAL STYLING (Based on the provided custom CSS) */
.modal-header {
  background: #667eea;
  color: white;
}

.save-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.save-button:hover {
  /* This hover style ensures the text and button background are solid white for better visibility */
  background: #fff; 
  color: #667eea;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  /* The text-clip/fill styles are removed as they conflict with solid backgrounds/borders */
}

.cancel-button {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.cancel-button:hover {
  /* This hover style ensures the text and button background are solid white for better visibility */
  background: #fff; 
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.4);
  transform: translateY(-3px);
}

/* ACTION BUTTON STYLING (Edit/Delete on list) */
.action-buttons {
    display: flex;
    gap: 8px;
}

.action-edit {
    background-color: #e3f2fd; 
    color: #0d47a1; 
    border: 1px solid #bbdefb;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
}

.action-edit:hover {
    background-color: #bbdefb;
    color: #0d47a1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(13, 71, 161, 0.2);
}

.action-delete {
    background-color: #ffebee; 
    color: #b71c1c; 
    border: 1px solid #ffcdd2;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
}

.action-delete:hover {
    background-color: #ffcdd2;
    color: #b71c1c;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(183, 28, 28, 0.2);
}
</style>