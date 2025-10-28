<template>
  <div class="min-vh-100 bg-gradient p-5">
    <div class="container">
      <div class="mb-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          <i class="bi bi-journal-text"></i> Journal
        </h1>
        <p class="text-muted fs-5">Log your thoughts and reflections to manage your wellness.</p>
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
          
          <div v-if="journalHistory.length">
              <div 
                v-for="entry in journalHistory" 
                :key="entry.id" 
                class="card card-body mb-2 p-3"
                :class="{'opacity-75 bg-light-subtle': entry.isSaving}"
              >
                  <span class="small text-muted mb-1 d-block fw-semibold">
                      {{ entry.date }} 
                      <i v-if="entry.isSaving" class="bi bi-cloud-arrow-up-fill text-warning ms-2"></i>
                  </span>
                  <p class="mb-0">{{ entry.text }}</p>
              </div>
          </div>
          <p v-else class="text-muted fst-italic">No entries saved yet. Start by writing your first journal entry above!</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; 
import { db } from '@/firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore'; 

const userId = ref('u1'); 
const journalEntry = ref('');
const journalHistory = ref([]); // Data populated by Firestore listener


function subscribeToJournalEntries() {
    const q = query(
        collection(db, 'journals'), 
        where('userId', '==', userId.value), // Filter by current user
        orderBy('date', 'desc') // Show most recent first
    );

    onSnapshot(q, (snapshot) => {
        // Map the Firestore documents to local reactive data
        const fetchedEntries = snapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
                id: doc.id,
                text: data.text,
                date: data.date.toDate().toLocaleString(), 
                isSaving: false 
            }
        });
        
        // Update the history array
        journalHistory.value = fetchedEntries;
        console.log(`Journal history for user ${userId.value} updated from Firestore.`);
    });
}


// Saves new entry
async function saveEntry() {
  if (journalEntry.value.trim()) {
    
    const newEntryData = {
        userId: userId.value,
        text: journalEntry.value.trim(),
        date: new Date(), 
    };
    
    const optimisticEntry = {
        id: Date.now(), 
        text: newEntryData.text,
        date: newEntryData.date.toLocaleString(), 
        isSaving: true 
    };

    journalHistory.value.unshift(optimisticEntry);
    journalEntry.value = ''; // Clear input immediately

    try {
        // Send data to Firestore
        await addDoc(collection(db, 'journals'), newEntryData);
        
        
    } catch (error) {
        console.error("Error saving journal entry:", error);
        alert('Failed to save journal entry to database. Please try again.');
        
        journalHistory.value = journalHistory.value.filter(e => e.id !== optimisticEntry.id);
    }

  } else {
    alert('Please write something before saving.');
  }
}

onMounted(() => {
    subscribeToJournalEntries();
});
</script>

<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>