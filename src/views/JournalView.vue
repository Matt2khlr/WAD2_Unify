<script setup>
import { ref } from 'vue';

const journalEntry = ref('');
const savedEntries = ref([]);

// Load saved entries from localStorage on mount
const loadEntries = () => {
  const stored = localStorage.getItem('journalEntries');
  if (stored) {
    savedEntries.value = JSON.parse(stored);
  }
};

loadEntries();

// Save journal entry
function saveEntry() {
  if (journalEntry.value.trim()) {
    const entry = {
      id: Date.now(),
      text: journalEntry.value.trim(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };
    
    savedEntries.value.unshift(entry); // Add to beginning
    localStorage.setItem('journalEntries', JSON.stringify(savedEntries.value));
    
    alert('Journal entry saved successfully!');
    journalEntry.value = '';
  } else {
    alert('Please write something before saving.');
  }
}

// Delete an entry
function deleteEntry(id) {
  if (confirm('Are you sure you want to delete this entry?')) {
    savedEntries.value = savedEntries.value.filter(e => e.id !== id);
    localStorage.setItem('journalEntries', JSON.stringify(savedEntries.value));
  }
}
</script>

<template>
  <!-- Header -->
  <div class="min-vh-100 bg-gradient p-5">
    <div class="container">
      <div class="mb-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          <i class="bi bi-journal-text"></i> Daily Journal
        </h1>
        <p class="text-muted fs-5">Reflect on your learning journey</p>
      </div>

      <!-- Journal Entry -->
      <div class="p-4 shadow rounded bg-light mb-4">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-pencil-square"></i> New Journal Entry
        </h3>
        <textarea 
          class="form-control" 
          rows="8" 
          placeholder="Write about your learning experience today, challenges you faced, insights you gained..."
          v-model="journalEntry"
        ></textarea>
        <button class="btn btn-primary mt-3" @click="saveEntry">
          <i class="bi bi-save me-2"></i>Save Entry
        </button>
      </div>

      <!-- Previous Entries -->
      <div class="p-4 shadow rounded bg-light" v-if="savedEntries.length">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-clock-history"></i> Previous Entries
        </h3>
        <div class="entry-list">
          <div v-for="entry in savedEntries" :key="entry.id" class="entry-item mb-3 p-3 border rounded">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <small class="text-muted">
                <i class="bi bi-calendar3 me-1"></i>{{ entry.date }} 
                <i class="bi bi-clock ms-2 me-1"></i>{{ entry.time }}
              </small>
              <button 
                class="btn btn-sm btn-outline-danger"
                @click="deleteEntry(entry.id)"
                title="Delete Entry">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <p class="mb-0">{{ entry.text }}</p>
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

.entry-item {
  background-color: #f8f9fa;
  transition: all 0.3s ease;
}

.entry-item:hover {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.entry-list {
  max-height: 500px;
  overflow-y: auto;
}
</style>