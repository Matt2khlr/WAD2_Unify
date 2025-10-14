<script setup>
import { ref, onMounted, computed } from 'vue';

const getInitialModules = () => {
  const storedData = localStorage.getItem('studentModules');
  if (storedData) {
    return JSON.parse(storedData);
  }
  
  // Default modules based on HomePage
  return [
    { name: "Data Structures", progress: 0, topics: [] },
    { name: "Calculus II", progress: 0, topics: [] },
    { name: "Physics", progress: 0, topics: [] }, 
    { name: "Web Development", progress: 0, topics: [] },
  ];
};

const modules = ref(getInitialModules());
const newTopic = ref('');
const selectedModule = ref(modules.value.length ? modules.value[0].name : '');
const journalEntry = ref('');

// Filters out modules that have no topics
const modulesWithTopics = computed(() => {
    return modules.value.filter(m => m.topics.length > 0);
});

function saveAllData() {
    localStorage.setItem('studentModules', JSON.stringify(modules.value));
}

function addTopic() {
  if (newTopic.value.trim() && selectedModule.value) {
    const targetModule = modules.value.find(m => m.name === selectedModule.value);
    
    if (targetModule) {
      targetModule.topics.push({
        id: targetModule.name.toLowerCase().replace(/\s/g, '-') + '-' + Date.now(),
        title: newTopic.value.trim(),
        completed: false
      });

      newTopic.value = ''; 
      saveAllData();   
    }
  }
}

function recalculateModuleProgress(moduleName) {
    const targetModule = modules.value.find(m => m.name === moduleName);

    if (targetModule) {
        const completedCount = targetModule.topics.filter(t => t.completed).length;
        const totalCount = targetModule.topics.length;
        
        targetModule.progress = totalCount > 0 
            ? Math.round((completedCount / totalCount) * 100) 
            : 0;
        
        saveAllData();
        console.log(`Module Progress for ${targetModule.name} updated to ${targetModule.progress}%!`);
    }
}

function deleteTopic(moduleName, topicId) {
    const targetModule = modules.value.find(m => m.name === moduleName);

    if (targetModule) {
        const initialCount = targetModule.topics.length;
        targetModule.topics = targetModule.topics.filter(t => t.id !== topicId);

        if (targetModule.topics.length < initialCount) {
            recalculateModuleProgress(moduleName);
            console.log(`Topic ID: ${topicId} deleted from ${moduleName}.`);
        }
    }
}

// Journal entry
function saveEntry() {
  if (journalEntry.value.trim()) {
    alert('Journal entry text saved (Note: Topic progress is saved automatically when you check the box).');
    journalEntry.value = '';
  } else {
    alert('Please write something before saving.');
  }
}
</script>

<template>
<!-- Header -->
  <div class="min-vh-100 bg-gradient p-5">
    <div class="container">
      <div class="mb-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          <i class="bi bi-journal-text"></i> Journal & Progress Tracker
        </h1>
        <p class="text-muted fs-5">Track your progress and daily thoughts</p>
      </div>

<!-- Add topics to module -->
      <div class="p-4 shadow rounded bg-light mb-4">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-folder-plus"></i> Add New Topic
        </h3>
        <div class="d-flex gap-3">
          <select class="form-select w-50" v-model="selectedModule">
            <option v-for="m in modules" :key="m.name" :value="m.name">
              {{ m.name }}
            </option>
          </select>
          <input 
            type="text" 
            class="form-control" 
            placeholder="e.g., Fourier Series, Hash Maps, etc."
            v-model="newTopic"
            @keyup.enter="addTopic"
          />
          <button class="btn btn-success" @click="addTopic">Add</button>
        </div>
      </div>

<!-- Checklist for completed topics -->
      <div class="p-4 shadow rounded bg-light mb-4">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-check2-square"></i> Topic Progress Checklist
        </h3>
        
        <div v-if="modulesWithTopics.length">
          <div v-for="module in modulesWithTopics" :key="module.name" class="mb-4">
            <h4 class="h6 fw-bold text-primary mb-2">
                {{ module.name }} ({{ module.topics.filter(t => t.completed).length }}/{{ module.topics.length }})
            </h4>
            <ul class="list-group">
              <li 
                class="list-group-item d-flex align-items-center justify-content-between" v-for="topic in module.topics" 
                :key="topic.id">
                
                <div class="d-flex align-items-center flex-grow-1"> <input 
                    class="form-check-input me-3" 
                    type="checkbox" 
                    :id="'check-'+topic.id" 
                    v-model="topic.completed"
                    @change="recalculateModuleProgress(module.name)" />
                <label 
                    class="form-check-label flex-grow-1"
                    :class="{'text-decoration-line-through text-muted': topic.completed}"
                    :for="'check-'+topic.id">
                {{ topic.title }}
                </label>
                </div>
    
                <button 
                    class="btn btn-sm btn-danger ms-2 p-0" 
                    style="width: 20px; height: 20px; font-size: 10px; line-height: 1; border-radius: 50%;"
                     @click="deleteTopic(module.name, topic.id)"
                    title="Delete Topic">   
                    &times;
                </button>
              </li>
            </ul>
          </div>
        </div>
        <p v-else class="text-muted fst-italic">No topics added yet. Start by adding a topic above!</p>
      </div>

<!-- Journal Entry -->
      <div class="p-4 shadow rounded bg-light">
        <h3 class="h5 mb-3 d-flex align-items-center gap-2">
          <i class="bi bi-pencil-square"></i> Journal Entry
        </h3>
        <textarea 
          class="form-control" 
          rows="6" 
          placeholder="Write your thoughts here..."
          v-model="journalEntry"
        ></textarea>
        <button class="btn btn-primary mt-3" @click="saveEntry">Save Journal Text</button>
      </div>
    </div>
  </div>
</template>



<style scoped>
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>