<script setup>
import { ref, onMounted } from 'vue'; 
import { db, auth } from '@/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, where, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 

const userId = ref(null); 
const journalEntry = ref('');
const journalHistory = ref([]); 
const editingEntry = ref(null); 

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

// FIREBASE READ FUNCTION (Real-time Listener)
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
      alert('You must be logged in to save a journal entry.');
      return;
  }
  
  if (!journalEntry.value.trim()) {
    alert('Please write something before saving.');
    return;
  }
  
  if (!selectedMood.value) {
      alert('Please select a mood before saving your journal entry.');
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
      
  } catch (error) {
      console.error("Error saving journal entry:", error);
      alert('Failed to save journal entry to database. Please try again.');
      
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
    } catch (error) {
        console.error("Error updating entry:", error);
        alert('Failed to save changes to the journal entry.');
    }
}

// 3. Deletes the entry from Firestore
async function deleteJournalEntry(id) {
    if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
        return;
    }
    
    try {
        const entryRef = doc(db, 'journals', id);
        await deleteDoc(entryRef);
        
        // Success: onSnapshot handles removal from the list automatically.
    } catch (error) {
        console.error("Error deleting entry:", error);
        alert('Failed to delete the journal entry.');
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
            <i class="bi bi-clock-history"></i> Recent Entries
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

                          <div class="btn-group btn-group-sm" role="group" v-if="!entry.isSaving">
                              <button 
                                  type="button" 
                                  class="btn btn-outline-info"
                                  @click="openEditDialog(entry)"
                              >
                                  <i class="bi bi-pencil"></i> Edit
                              </button>
                              <button 
                                  type="button" 
                                  class="btn btn-outline-danger"
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
          <p v-else class="text-muted fst-italic">No entries saved yet. Start by writing your first journal entry above!</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>