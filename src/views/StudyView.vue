<script>
import { db, auth } from '../firebase';
import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Toast, Tooltip } from 'bootstrap';
import Tesseract from 'tesseract.js';
import exampleTimetableImage from '@/assets/example exam schedule.jpeg';

export default {
  name: 'StudyApp',
  data() {
    return {
      // Example image for instructions
      exampleTimetableImage,

      // Toast notification
      toastMessage: '',

      // User authentication
      userId: null,
      unsubscribeTopics: null,
      unsubscribeFlashcards: null,

      // Topics Management
      topics: [],
      topicIdCounter: 1,
      newTopic: {
        module: '',
        name: ''
      },
      customModuleName: '',
      modules: ['IS216'],
      showModuleList: false,

      // Exam Management
      exams: [],
      examIdCounter: 1,
      showExamModal: false,
      newExam: {
        module: '',
        date: '',
        time: ''
      },
      uploadedImage: null,
      isProcessingImage: false,
      ocrProgress: 0,
      parsedExams: [],
      ocrDebugText: '',

      // Help tooltips
      showPomodoroHelp: false,
      showSpacedRepHelp: false,

      // Pomodoro Timer
      minutes: 25,
      seconds: 0,
      studyTime: 25,
      breakTime: 5,
      isBreak: false,
      isRunning: false,
      timerInterval: null,
      selectedPreset: 'pomodoro',
      customStudy: 25,
      customBreak: 5,
      studySessionStartTime: null,

      // Flashcards
      flashcards: [],
      newCard: { question: '', answer: '', module: '', topic: '' },
      showAddCard: false,
      reviewMode: false,
      singleCardMode: false,
      currentCardIndex: 0,
      cardIdCounter: 1,
      showExamDateModal: false,
      examDate: '',
      reviewCards: [], // Array to hold cards being reviewed in current session
      showAllAnswers: false, // Toggle to show/hide all answers in list view
      selectedModuleFilter: 'all', // Filter for module selection in review
      selectedTopicFilter: 'all', // Filter for topic selection in review
      editingCardId: null, // ID of card currently being edited
      editForm: { question: '', answer: '', module: '', topic: '' } // Form for editing cards
    };
  },
  computed: {
    // Topics computed properties
    completedTopicsCount() {
      return this.topics.filter(t => t.completed).length;
    },
    topicsProgress() {
      if (this.topics.length === 0) return 0;
      return (this.completedTopicsCount / this.topics.length) * 100;
    },
    topicsByModule() {
      const grouped = {};
      this.topics.forEach(topic => {
        if (!grouped[topic.module]) {
          grouped[topic.module] = {
            name: topic.module,
            topics: []
          };
        }
        grouped[topic.module].topics.push(topic);
      });
      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    },

    // Timer computed properties
    formattedTime() {
      const mins = this.minutes.toString().padStart(2, '0');
      const secs = this.seconds.toString().padStart(2, '0');
      return `${mins}:${secs}`;
    },

    // Flashcard computed properties
    dueCards() {
      const today = new Date().toISOString().split('T')[0];
      return this.flashcards.filter(card => card.nextReview <= today);
    },
    upcomingCards() {
      const today = new Date().toISOString().split('T')[0];
      return this.flashcards.filter(card => card.nextReview > today)
        .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    },
    allCards() {
      // All flashcards available for review anytime
      return this.flashcards;
    },
    currentCard() {
      return this.reviewCards[this.currentCardIndex] || null;
    },
    reviewProgress() {
      if (this.reviewCards.length === 0) return 0;
      return ((this.currentCardIndex + 1) / this.reviewCards.length) * 100;
    },
    availableModulesInFlashcards() {
      // Get unique modules from flashcards that have modules assigned
      const modulesSet = new Set();
      this.flashcards.forEach(card => {
        if (card.module) {
          modulesSet.add(card.module);
        }
      });
      return Array.from(modulesSet).sort();
    },
    availableTopicsInFlashcards() {
      // Get unique topics from flashcards that have topics assigned
      // Filter by module if a module is selected
      const topicsSet = new Set();
      this.flashcards.forEach(card => {
        if (card.topic) {
          // Only include topics from the selected module
          if (this.selectedModuleFilter === 'all' || card.module === this.selectedModuleFilter) {
            topicsSet.add(card.topic);
          }
        }
      });
      return Array.from(topicsSet).sort();
    },
    filteredDueCards() {
      const today = new Date().toISOString().split('T')[0];
      let cards = this.flashcards.filter(card => card.nextReview <= today);

      // Filter by module
      if (this.selectedModuleFilter !== 'all') {
        cards = cards.filter(card => card.module === this.selectedModuleFilter);
      }

      // Filter by topic
      if (this.selectedTopicFilter !== 'all') {
        cards = cards.filter(card => card.topic === this.selectedTopicFilter);
      }

      return cards;
    },
    filteredAllCards() {
      let cards = this.flashcards;

      // Filter by module
      if (this.selectedModuleFilter !== 'all') {
        cards = cards.filter(card => card.module === this.selectedModuleFilter);
      }

      // Filter by topic
      if (this.selectedTopicFilter !== 'all') {
        cards = cards.filter(card => card.topic === this.selectedTopicFilter);
      }

      return cards;
    }
  },
  methods: {
    // Topics methods
    async addTopic() {
      if (!this.newTopic.name.trim()) {
        this.showToast('Please enter a topic name');
        return;
      }

      let moduleName = this.newTopic.module;

      if (this.newTopic.module === 'custom') {
        if (!this.customModuleName.trim()) {
          this.showToast('Please enter a custom module name');
          return;
        }
        moduleName = this.customModuleName;
        // Add custom module to the list if it's not already there
        if (!this.modules.includes(moduleName)) {
          this.modules.splice(this.modules.length, 0, moduleName);
        }
      } else if (!moduleName) {
        this.showToast('Please select a module');
        return;
      }

      // Save to Firebase if user is authenticated
      if (this.userId) {
        try {
          const studyDataRef = collection(db, 'studydata');
          await addDoc(studyDataRef, {
            userId: this.userId,
            module: moduleName,
            topic: this.newTopic.name,
            completed: false,
            addedDate: new Date().toISOString()
          });
          console.log('Topic saved to Firebase');
          // The real-time listener will automatically add it to this.topics
        } catch (error) {
          console.error('Error saving topic to Firebase:', error);
          this.showToast('Error saving topic. Please try again.');
          return;
        }
      } else {
        // If not authenticated, add locally
        const topic = {
          id: this.topicIdCounter++,
          module: moduleName,
          name: this.newTopic.name,
          completed: false,
          addedDate: new Date().toISOString()
        };
        this.topics.push(topic);
        this.saveTopicsToLocalStorage();
      }

      this.newTopic = { module: '', name: '' };
      this.customModuleName = '';
    },
    async deleteTopic(id, topicName) {
      if (confirm(`Are you sure you want to delete the topic "${topicName}"? This action cannot be undone.`)) {
        // Find the topic to get its Firebase document ID
        const topicToDelete = this.topics.find(t => t.id === id);

        // Remove from local array
        this.topics = this.topics.filter(t => t.id !== id);

        // Delete from Firebase if user is authenticated and topic has firebaseId
        if (this.userId && topicToDelete && topicToDelete.firebaseId) {
          try {
            const docRef = doc(db, 'studydata', topicToDelete.firebaseId);
            await deleteDoc(docRef);
            console.log('Topic deleted from Firebase');
            this.showToast('Topic deleted successfully');
          } catch (error) {
            console.error('Error deleting topic from Firebase:', error);
          }
        }

        this.saveTopicsToLocalStorage();
      }
    },
    async clearAllTopics() {
      if (confirm('Are you sure you want to clear all topics? This cannot be undone.')) {
        // Delete all topics from Firebase if user is authenticated
        if (this.userId) {
          try {
            const q = query(collection(db, 'studydata'), where('userId', '==', this.userId));
            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
            await Promise.all(deletePromises);
            console.log('All topics deleted from Firebase');
          } catch (error) {
            console.error('Error deleting topics from Firebase:', error);
          }
        }

        this.topics = [];
        this.topicIdCounter = 1;
        this.saveTopicsToLocalStorage();
      }
    },
    formatTopicDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
    async deleteModule(moduleName) {
      // Check if there are any topics using this module
      const topicsUsingModule = this.topics.filter(t => t.module === moduleName);

      if (topicsUsingModule.length > 0) {
        const confirmDelete = confirm(
          `This module has ${topicsUsingModule.length} topic(s). Deleting this module will also delete all associated topics. Are you sure?`
        );
        if (!confirmDelete) {
          return;
        }

        // Delete all topics associated with this module from Firebase
        if (this.userId) {
          try {
            const deletePromises = topicsUsingModule
              .filter(t => t.firebaseId)
              .map(t => deleteDoc(doc(db, 'studydata', t.firebaseId)));
            await Promise.all(deletePromises);
            console.log(`Deleted ${deletePromises.length} topics from Firebase for module: ${moduleName}`);
          } catch (error) {
            console.error('Error deleting topics from Firebase:', error);
          }
        }

        // Remove topics from local array
        this.topics = this.topics.filter(t => t.module !== moduleName);
      } else {
        const confirmDelete = confirm(`Are you sure you want to delete the module "${moduleName}"?`);
        if (!confirmDelete) {
          return;
        }
      }

      // Remove the module from the list
      this.modules = this.modules.filter(m => m !== moduleName);
      this.saveTopicsToLocalStorage();

      console.log(`Module "${moduleName}" deleted`);
    },
    async updateTopicCompletion(topic) {
      // Update in Firebase if user is authenticated and topic has firebaseId
      if (this.userId && topic.firebaseId) {
        try {
          const docRef = doc(db, 'studydata', topic.firebaseId);
          await updateDoc(docRef, {
            completed: topic.completed
          });
          console.log('Topic completion status updated in Firebase');
        } catch (error) {
          console.error('Error updating topic in Firebase:', error);
        }
      }
      // Always save to localStorage as backup
      this.saveTopicsToLocalStorage();
    },
    saveTopicsToLocalStorage() {
      // Save to localStorage as backup
      const data = {
        topics: this.topics,
        topicIdCounter: this.topicIdCounter,
        customModules: this.modules.filter(m => m !== 'IS216')
      };
      localStorage.setItem('studyTopicsData', JSON.stringify(data));
    },
    async loadTopics() {
      // First try to load from Firebase if user is authenticated
      if (this.userId) {
        try {
          const q = query(collection(db, 'studydata'), where('userId', '==', this.userId));
          const querySnapshot = await getDocs(q);

          this.topics = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            this.topics.push({
              id: this.topicIdCounter++,
              firebaseId: docSnap.id,
              module: data.module,
              name: data.topic,
              completed: data.completed || false,
              addedDate: data.addedDate || new Date().toISOString()
            });

            // Add custom modules
            if (!this.modules.includes(data.module)) {
              this.modules.push(data.module);
            }
          });

          console.log('Topics loaded from Firebase:', this.topics.length);
          this.saveTopicsToLocalStorage();
          return;
        } catch (error) {
          console.error('Error loading topics from Firebase:', error);
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('studyTopicsData');
      if (saved) {
        const data = JSON.parse(saved);
        this.topics = data.topics || [];
        this.topicIdCounter = data.topicIdCounter || 1;
        if (data.customModules) {
          data.customModules.forEach(module => {
            if (!this.modules.includes(module)) {
              this.modules.push(module);
            }
          });
        }
      }
    },
    setupTopicsListener() {
      if (this.userId) {
        const q = query(collection(db, 'studydata'), where('userId', '==', this.userId));
        this.unsubscribeTopics = onSnapshot(q, (querySnapshot) => {
          this.topics = [];
          this.topicIdCounter = 1;

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            this.topics.push({
              id: this.topicIdCounter++,
              firebaseId: docSnap.id,
              module: data.module,
              name: data.topic,
              completed: data.completed || false,
              addedDate: data.addedDate || new Date().toISOString()
            });

            // Add custom modules
            if (!this.modules.includes(data.module)) {
              this.modules.push(data.module);
            }
          });

          console.log('Topics updated from Firebase realtime listener:', this.topics.length);
          this.saveTopicsToLocalStorage();
        }, (error) => {
          console.error('Error listening to topics:', error);
        });
      }
    },

    async loadFlashcards() {
      // First try to load from Firebase if user is authenticated
      if (this.userId) {
        try {
          const q = query(collection(db, 'flashcards'), where('userId', '==', this.userId));
          const querySnapshot = await getDocs(q);

          this.flashcards = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            this.flashcards.push({
              id: docSnap.id,
              firebaseId: docSnap.id,
              question: data.question,
              answer: data.answer,
              module: data.module || '',
              topic: data.topic || '',
              nextReview: data.nextReview || new Date().toISOString().split('T')[0],
              interval: data.interval || 1,
              flipped: false,
              showAnswer: false,
              isFlipping: false
            });
          });

          console.log('Flashcards loaded from Firebase:', this.flashcards.length);
          this.saveData(); // Save to localStorage as backup
          return;
        } catch (error) {
          console.error('Error loading flashcards from Firebase:', error);
        }
      }

      // Fallback to localStorage
      this.loadData();
    },

    setupFlashcardsListener() {
      if (this.userId) {
        const q = query(collection(db, 'flashcards'), where('userId', '==', this.userId));
        this.unsubscribeFlashcards = onSnapshot(q, (querySnapshot) => {
          this.flashcards = [];

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            this.flashcards.push({
              id: docSnap.id,
              firebaseId: docSnap.id,
              question: data.question,
              answer: data.answer,
              module: data.module || '',
              topic: data.topic || '',
              nextReview: data.nextReview || new Date().toISOString().split('T')[0],
              interval: data.interval || 1,
              flipped: false,
              showAnswer: false,
              isFlipping: false
            });
          });

          console.log('Flashcards updated from Firebase realtime listener:', this.flashcards.length);
          this.saveData(); // Save to localStorage as backup
        }, (error) => {
          console.error('Error listening to flashcards:', error);
        });
      }
    },

    // Timer methods
    setPreset(type) {
      this.selectedPreset = type;
      if (type === 'pomodoro') {
        this.studyTime = 25;
        this.breakTime = 5;
      } else if (type === 'short') {
        this.studyTime = 15;
        this.breakTime = 3;
      } else if (type === 'long') {
        this.studyTime = 50;
        this.breakTime = 10;
      }
      this.resetTimer();
    },
    setCustomTimer() {
      if (this.customStudy < 1 || this.customBreak < 1) {
        this.showToast('Please enter valid times');
        return;
      }
      this.studyTime = this.customStudy;
      this.breakTime = this.customBreak;
      this.resetTimer();
    },
    startTimer() {
      this.isRunning = true;

      // Record start time when starting a study session (not a break)
      if (!this.isBreak) {
        this.studySessionStartTime = new Date();
        console.log('Study session started at:', this.studySessionStartTime);
      }

      this.timerInterval = setInterval(() => {
        if (this.seconds === 0) {
          if (this.minutes === 0) {
            this.timerComplete();
            return;
          }
          this.minutes--;
          this.seconds = 59;
        } else {
          this.seconds--;
        }
      }, 1000);
    },
    pauseTimer() {
      this.isRunning = false;
      clearInterval(this.timerInterval);
      // Note: We don't clear studySessionStartTime here, so it persists through pauses
    },
    resetTimer() {
      this.pauseTimer();
      this.minutes = this.isBreak ? this.breakTime : this.studyTime;
      this.seconds = 0;
      // Clear start time if resetting during a study session
      if (!this.isBreak) {
        this.studySessionStartTime = null;
      }
    },
    async timerComplete() {
      this.pauseTimer();

      // If completing a study session (not a break), save to Firebase
      if (!this.isBreak && this.studySessionStartTime) {
        await this.saveStudySession();
      }

      this.isBreak = !this.isBreak;
      this.minutes = this.isBreak ? this.breakTime : this.studyTime;
      this.seconds = 0;

    },
    async saveStudySession() {
      if (!this.userId || !this.studySessionStartTime) {
        console.log('No user authenticated or no start time recorded');
        return;
      }

      try {
        const endTime = new Date();
        const studyTimesRef = collection(db, 'studytimes');

        await addDoc(studyTimesRef, {
          userId: this.userId,
          starttime: Timestamp.fromDate(this.studySessionStartTime),
          endtime: Timestamp.fromDate(endTime)
        });

        console.log('Study session saved to Firebase:', {
          start: this.studySessionStartTime,
          end: endTime
        });

        // Clear the start time after saving
        this.studySessionStartTime = null;
      } catch (error) {
        console.error('Error saving study session to Firebase:', error);
      }
    },

    // Flashcard methods
    getTopicsForModule(moduleName) {
      if (!moduleName) return [];
      return this.topics.filter(topic => topic.module === moduleName);
    },
    async addFlashcard() {
      if (!this.newCard.question || !this.newCard.answer) {
        this.showToast('Please fill in both question and answer');
        return;
      }

      try {
        if (this.userId) {
          // Save to Firebase
          const flashcardsRef = collection(db, 'flashcards');
          const cardData = {
            userId: this.userId,
            question: this.newCard.question,
            answer: this.newCard.answer,
            module: this.newCard.module || '',
            topic: this.newCard.topic || '',
            nextReview: new Date().toISOString().split('T')[0],
            interval: 1,
            createdAt: new Date().toISOString()
          };

          console.log('Adding flashcard to Firebase:', cardData);
          const docRef = await addDoc(flashcardsRef, cardData);
          console.log('Flashcard added with ID:', docRef.id);

          // Immediately add to local array while waiting for listener
          const card = {
            id: docRef.id,
            firebaseId: docRef.id,
            ...cardData,
            flipped: false,
            showAnswer: false,
            isFlipping: false
          };
          this.flashcards.push(card);

          this.showToast('Flashcard added successfully');
        } else {
          // Fallback to localStorage if not authenticated
          const card = {
            id: this.cardIdCounter++,
            question: this.newCard.question,
            answer: this.newCard.answer,
            module: this.newCard.module || '',
            topic: this.newCard.topic || '',
            nextReview: new Date().toISOString().split('T')[0],
            interval: 1,
            flipped: false,
            showAnswer: false,
            isFlipping: false
          };

          this.flashcards.push(card);
          this.saveData();
          this.showToast('Flashcard added (local storage)');
        }

        this.newCard = { question: '', answer: '', module: '', topic: '' };
        this.showAddCard = false;
      } catch (error) {
        console.error('Error adding flashcard:', error);
        this.showToast('Error adding flashcard: ' + error.message);
      }
    },
    toggleAddCard() {
      this.showAddCard = !this.showAddCard;

      // Auto-scroll to form when opening
      if (this.showAddCard) {
        this.$nextTick(() => {
          const formElement = document.querySelector('.add-flashcard');
          if (formElement) {
            formElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        });
      }
    },
    flipCard(card) {
      card.flipped = !card.flipped;
    },
    startReview() {
      // Start review session with only due cards (filtered by topic if selected)
      if (this.filteredDueCards.length === 0) {
        const message = this.selectedTopicFilter !== 'all'
          ? `No cards are due for review in topic "${this.selectedTopicFilter}"!`
          : 'No cards are due for review right now!';
        this.showToast(message);
        return;
      }
      this.reviewCards = [...this.filteredDueCards];
      this.reviewMode = true;
      this.singleCardMode = false;
      this.currentCardIndex = 0;
      // Reset all flipped states
      this.reviewCards.forEach(card => card.flipped = false);
    },
    startAllCardsReview() {
      // Start review session with all cards (filtered by topic if selected)
      if (this.filteredAllCards.length === 0) {
        const message = this.selectedTopicFilter !== 'all'
          ? `No flashcards available in topic "${this.selectedTopicFilter}"!`
          : 'No flashcards available!';
        this.showToast(message);
        return;
      }
      this.reviewCards = [...this.filteredAllCards];
      this.reviewMode = true;
      this.singleCardMode = false;
      this.currentCardIndex = 0;
      // Reset all flipped states
      this.reviewCards.forEach(card => card.flipped = false);
    },
    startSingleCardReview(cardId) {
      // Review only a single specific card
      const card = this.allCards.find(c => c.id === cardId);
      if (card) {
        this.reviewCards = [card];
        this.currentCardIndex = 0;
        this.reviewMode = true;
        this.singleCardMode = true;
        // Reset flipped state
        card.flipped = false;
      }
    },
    flipCurrentCard() {
      if (this.currentCard) {
        // Add flipping animation
        this.currentCard.isFlipping = true;

        // Toggle flipped state after half the flip animation
        setTimeout(() => {
          this.currentCard.flipped = !this.currentCard.flipped;
        }, 200);

        // Remove flipping class after animation completes
        setTimeout(() => {
          this.currentCard.isFlipping = false;
        }, 400);
      }
    },
    rateCurrentCard(difficulty) {
      this.rateCard(this.currentCard, difficulty);

      // If in single card mode, end the review immediately
      if (this.singleCardMode) {
        this.endReview();
        return;
      }

      // Move to next card or end review
      if (this.currentCardIndex < this.reviewCards.length - 1) {
        this.currentCardIndex++;
      } else {
        // End review silently
        this.endReview();
      }
    },
    endReview() {
      this.reviewMode = false;
      this.singleCardMode = false;
      this.currentCardIndex = 0;
      this.reviewCards.forEach(card => card.flipped = false);
      this.reviewCards = [];
    },
    async rateCard(cardOrId, difficulty) {
      // Handle both card object (from review mode) and card ID (from list view)
      const card = typeof cardOrId === 'object' ? cardOrId : this.flashcards.find(c => c.id === cardOrId);
      if (!card) return;

      let daysToAdd;
      if (difficulty === 'hard') {
        daysToAdd = 1;
        card.interval = 1;
      } else if (difficulty === 'medium') {
        daysToAdd = 3;
        card.interval = 3;
      } else {
        daysToAdd = 7;
        card.interval = Math.min(card.interval * 2, 30);
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysToAdd);

      // Check if next review would be after exam date
      if (this.examDate) {
        const examDateTime = new Date(this.examDate).getTime();
        if (nextDate.getTime() > examDateTime) {
          nextDate.setTime(examDateTime);
        }
      }

      card.nextReview = nextDate.toISOString().split('T')[0];
      card.flipped = false;
      card.showAnswer = false; // Collapse the answer after rating

      // Save to Firebase if authenticated
      if (this.userId && card.id) {
        try {
          await updateDoc(doc(db, 'flashcards', card.id), {
            nextReview: card.nextReview,
            interval: card.interval
          });
        } catch (error) {
          console.error('Error updating flashcard in Firebase:', error);
        }
      } else {
        // Save to localStorage as backup
        this.saveData();
      }
    },
    async deleteCard(id) {
      if (confirm('Delete this flashcard?')) {
        try {
          if (this.userId) {
            // Delete from Firebase
            await deleteDoc(doc(db, 'flashcards', id));
          }

          // Delete from local array
          this.flashcards = this.flashcards.filter(c => c.id !== id);

          // Save to localStorage as backup if not authenticated
          if (!this.userId) {
            this.saveData();
          }

          this.showToast('Flashcard deleted');
        } catch (error) {
          console.error('Error deleting flashcard:', error);
          this.showToast('Error deleting flashcard: ' + error.message);
        }
      }
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
    daysUntil(dateStr) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reviewDate = new Date(dateStr);
      reviewDate.setHours(0, 0, 0, 0);
      const diff = Math.ceil((reviewDate - today) / (1000 * 60 * 60 * 24));
      return diff;
    },
    getBadgeClass(dateStr) {
      const days = this.daysUntil(dateStr);
      if (days <= 1) return 'bg-danger';
      if (days <= 3) return 'bg-warning';
      return 'bg-success';
    },
    // Exam Management Methods
    async addExam() {
      // When adding from parsed image, require at least module and date
      // When manually entering, require all fields
      const isParsedFromImage = this.parsedExams.length > 0;

      if (isParsedFromImage) {
        // For parsed exams, require at least module and date
        if (!this.newExam.module || !this.newExam.date) {
          this.showToast('Module and date are required');
          return;
        }
      } else {
        // For manual entry, require all fields
        if (!this.newExam.module || !this.newExam.date || !this.newExam.time) {
          this.showToast('Please fill in all fields');
          return;
        }
      }

      // Save to Firebase if user is authenticated
      if (this.userId) {
        try {
          console.log('Saving exam to Firebase...', {
            userId: this.userId,
            module: this.newExam.module,
            date: this.newExam.date,
            time: this.newExam.time
          });

          const examsRef = collection(db, 'exams');
          const docRef = await addDoc(examsRef, {
            userId: this.userId,
            module: this.newExam.module,
            date: this.newExam.date,
            time: this.newExam.time,
            createdAt: new Date().toISOString()
          });

          console.log('Exam saved to Firebase with ID:', docRef.id);

          // Create exam object with Firebase ID
          const exam = {
            id: this.examIdCounter++,
            firebaseId: docRef.id,
            module: this.newExam.module,
            date: this.newExam.date,
            time: this.newExam.time,
            userId: this.userId
          };

          // Add to local array
          this.exams.push(exam);

          this.closeExamModal();
          this.saveExamsToLocalStorage();
        } catch (error) {
          console.error('Error saving exam to Firebase:', error);
          this.showToast('Error saving exam: ' + error.message);
          return;
        }
      } else {
        // If not authenticated, add locally
        const exam = {
          id: this.examIdCounter++,
          module: this.newExam.module,
          date: this.newExam.date,
          time: this.newExam.time,
          userId: null
        };
        this.exams.push(exam);
        this.closeExamModal();
        this.saveExamsToLocalStorage();
      }
    },
    async deleteExam(examId) {
      const exam = this.exams.find(e => e.id === examId);
      if (!exam) return;

      if (!confirm(`Are you sure you want to delete the exam for ${exam.module}?`)) {
        return;
      }

      // Delete from Firebase
      if (this.userId && exam.firebaseId) {
        try {
          await deleteDoc(doc(db, 'exams', exam.firebaseId));
          console.log('Exam deleted from Firebase');
          this.showToast('Exam deleted successfully');
          // Remove from calendar if it was added
          await this.removeExamFromCalendar(exam);
        } catch (error) {
          console.error('Error deleting exam from Firebase:', error);
        }
      }

      // Remove from local array
      this.exams = this.exams.filter(e => e.id !== examId);
      this.saveExamsToLocalStorage();
    },
    async deleteAllExams() {
      if (this.exams.length === 0) {
        this.showToast('No exams to delete');
        return;
      }

      if (!confirm(`Are you sure you want to delete all ${this.exams.length} exam(s)? This action cannot be undone.`)) {
        return;
      }

      // Delete all from Firebase
      if (this.userId) {
        try {
          const deletePromises = [];
          for (const exam of this.exams) {
            if (exam.firebaseId) {
              deletePromises.push(deleteDoc(doc(db, 'exams', exam.firebaseId)));
              // Also remove from calendar if it was added
              deletePromises.push(this.removeExamFromCalendar(exam));
            }
          }
          await Promise.all(deletePromises);
          console.log('All exams deleted from Firebase');
          this.showToast('All exams deleted successfully');
        } catch (error) {
          console.error('Error deleting exams from Firebase:', error);
          this.showToast('Error deleting some exams. Please try again.');
        }
      }

      // Clear local array
      this.exams = [];
      this.saveExamsToLocalStorage();
      this.showToast('All exams deleted successfully');
    },
    async handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImage = e.target.result;
      };
      reader.readAsDataURL(file);

      // Process with OCR
      this.isProcessingImage = true;
      this.ocrProgress = 0;
      this.parsedExams = [];

      try {
        const { data: { text } } = await Tesseract.recognize(
          file,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                this.ocrProgress = Math.round(m.progress * 100);
              }
            }
          }
        );

        // Debug: Log and store the extracted text
        console.log('OCR Extracted Text:', text);
        console.log('OCR Text Lines:', text.split('\n'));
        this.ocrDebugText = text;

        // Parse the extracted text
        this.parsedExams = this.parseExamTable(text);

        console.log('Parsed Exams:', this.parsedExams);

        if (this.parsedExams.length === 0) {
          this.showToast('No exam data found in image. Please check console for OCR output.');
        } else {
          this.showToast(`Found ${this.parsedExams.length} exam(s) in the image`);
        }
      } catch (error) {
        console.error('OCR Error:', error);
        this.showToast('Error processing image. Please try again or enter manually.');
      } finally {
        this.isProcessingImage = false;
      }
    },
    parseExamTable(text) {
      const exams = [];
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header lines
      let dataStart = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Code') || lines[i].includes('Description')) {
          dataStart = i + 1;
          break;
        }
      }

      // Process lines for exam data
      const dataLines = lines.slice(dataStart);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();

        // Skip empty lines or lines that are just dividers
        if (!line || line === '-' || /^[\s\-]+$/.test(line)) {
          continue;
        }

        // Look for course code pattern at the start of the line
        // Matches: "IS216", "COR-MGMT1302", "15211", etc.
        let codeMatch = line.match(/^([A-Z]{2,3}(?:-[A-Z]+)?\d{3,4})/);

        // If no match, try to fix OCR errors (1S -> IS, 15 -> IS, 1s -> IS (lowercase))
        if (!codeMatch) {
          // Try replacing leading 1 or 15 with I, or 1S/1s with IS
          let fixedLine = line;

          // Convert to uppercase for easier processing
          fixedLine = fixedLine.toUpperCase();

          // Handle patterns like "15213" -> "IS213" (both digits are wrong)
          fixedLine = fixedLine.replace(/^15(\d{3,4})/, 'IS$1');

          // Handle patterns like "1S215" or "1s215" -> "IS215" (first digit is wrong)
          fixedLine = fixedLine.replace(/^1([A-Z])/, 'I$1');

          // Try to match again with hyphen support
          codeMatch = fixedLine.match(/^([A-Z]{2,3}(?:-[A-Z]+)?\d{3,4})/);

          if (codeMatch) {
            // Use the fixed code
            const exam = {
              module: codeMatch[1],
              date: '',
              time: ''
            };

            // Extract date from the line
            const dateMatch = fixedLine.match(/(\d{1,2}[-\/]\w+[-\/]\d{4})|(\d{1,2}\s\w+\s\d{4})/);
            if (dateMatch) {
              exam.date = this.normalizeDate(dateMatch[0]);
            }

            // Extract time - handles both "HH:MM" and "HHMM" formats
            const timeMatch = fixedLine.match(/(\d{2}):?(\d{2})/);
            if (timeMatch) {
              exam.time = `${timeMatch[1]}:${timeMatch[2]}`;
            }

            // Add exam if we have at least module
            if (exam.module) {
              exams.push(exam);
            }
          }
        } else {
          // Course code found directly
          const exam = {
            module: codeMatch[1],
            date: '',
            time: ''
          };

          // Extract date from the line
          const dateMatch = line.match(/(\d{1,2}[-\/]\w+[-\/]\d{4})|(\d{1,2}\s\w+\s\d{4})/);
          if (dateMatch) {
            exam.date = this.normalizeDate(dateMatch[0]);
          }

          // Extract time - handles both "HH:MM" and "HHMM" formats
          const timeMatch = line.match(/(\d{2}):?(\d{2})/);
          if (timeMatch) {
            exam.time = `${timeMatch[1]}:${timeMatch[2]}`;
          }

          // Add exam if we have at least module
          if (exam.module) {
            exams.push(exam);
          }
        }
      }

      return exams;
    },
    normalizeDate(dateStr) {
      // Try to parse various date formats and convert to YYYY-MM-DD
      const dateObj = new Date(dateStr);

      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // If parsing fails, return original
      return dateStr;
    },
    async addSingleParsedExam(exam) {
      // Add a single parsed exam directly
      if (!exam.module) {
        this.showToast('Exam must have at least a module code');
        return;
      }

      try {
        // Save to Firebase if user is authenticated
        if (this.userId) {
          const examsRef = collection(db, 'exams');
          const docRef = await addDoc(examsRef, {
            userId: this.userId,
            module: exam.module,
            date: exam.date || '',
            time: exam.time || '',
            createdAt: new Date().toISOString()
          });

          // Create exam object with Firebase ID
          const newExam = {
            id: this.examIdCounter++,
            firebaseId: docRef.id,
            module: exam.module,
            date: exam.date || '',
            time: exam.time || ''
          };

          this.exams.push(newExam);

          // Add to calendar events
          await this.addExamToCalendar(newExam);

          this.showToast(`Added exam for ${exam.module}`);

          // Remove from parsed exams list
          const index = this.parsedExams.indexOf(exam);
          if (index > -1) {
            this.parsedExams.splice(index, 1);
          }

          // If no more parsed exams, clear the image and close modal
          if (this.parsedExams.length === 0) {
            this.uploadedImage = null;
            this.ocrDebugText = '';
            // Clear the file input
            if (this.$refs.examImageInput) {
              this.$refs.examImageInput.value = '';
            }
            this.closeExamModal();
          }
        } else {
          // Local storage fallback
          const newExam = {
            id: this.examIdCounter++,
            module: exam.module,
            date: exam.date || '',
            time: exam.time || ''
          };

          this.exams.push(newExam);
          this.saveExamsToLocalStorage();
          this.showToast(`Added exam for ${exam.module}`);

          // Remove from parsed exams list
          const index = this.parsedExams.indexOf(exam);
          if (index > -1) {
            this.parsedExams.splice(index, 1);
          }

          // If no more parsed exams, clear the image and close modal
          if (this.parsedExams.length === 0) {
            this.uploadedImage = null;
            this.ocrDebugText = '';
            // Clear the file input
            if (this.$refs.examImageInput) {
              this.$refs.examImageInput.value = '';
            }
            this.closeExamModal();
          }
        }
      } catch (error) {
        console.error('Error adding exam:', error);
        this.showToast('Error adding exam. Please try again.');
      }
    },
    async addAllParsedExams() {
      if (this.parsedExams.length === 0) {
        this.showToast('No exams to add');
        return;
      }

      const examsToAdd = [...this.parsedExams];
      for (const exam of examsToAdd) {
        await this.addSingleParsedExam(exam);
      }

      // Close modal after all exams have been added
      // (it may have been closed by the last exam in addSingleParsedExam, but this ensures it)
      this.closeExamModal();
    },
    closeExamModal() {
      this.showExamModal = false;
      this.newExam = { module: '', date: '', time: '' };
      this.uploadedImage = null;
      this.parsedExams = [];
      this.ocrProgress = 0;
      this.ocrDebugText = '';
      // Clear the file input
      if (this.$refs.examImageInput) {
        this.$refs.examImageInput.value = '';
      }
    },
    formatExamDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    async loadExams() {
      // Load from Firebase if user is authenticated
      if (this.userId) {
        try {
          const q = query(collection(db, 'exams'), where('userId', '==', this.userId));
          const querySnapshot = await getDocs(q);

          this.exams = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            this.exams.push({
              id: this.examIdCounter++,
              firebaseId: docSnap.id,
              module: data.module,
              date: data.date,
              time: data.time,
              userId: data.userId
            });
          });

          console.log('Exams loaded from Firebase:', this.exams.length);
          this.saveExamsToLocalStorage();
          return;
        } catch (error) {
          console.error('Error loading exams from Firebase:', error);
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('examsData');
      if (saved) {
        const data = JSON.parse(saved);
        this.exams = data.exams || [];
        this.examIdCounter = data.examIdCounter || 1;
      }
    },
    saveExamsToLocalStorage() {
      const data = {
        exams: this.exams,
        examIdCounter: this.examIdCounter
      };
      localStorage.setItem('examsData', JSON.stringify(data));
    },
    async addExamToCalendar(exam) {
      // Add the exam to the calendar events collection
      // Using the exact format as CalendarView
      try {
        // Skip if no date is provided
        if (!exam.date) {
          console.log('No date provided for exam, skipping calendar event');
          return;
        }

        const eventsRef = collection(db, 'events');

        // Create Date object from exam date and time
        const [year, month, day] = exam.date.split('-').map(Number);

        // Default to 9:00 AM if no time is provided
        let hours = 9;
        let minutes = 0;

        if (exam.time && exam.time.trim()) {
          const timeParts = exam.time.split(':');
          if (timeParts.length >= 2) {
            hours = parseInt(timeParts[0]);
            minutes = parseInt(timeParts[1]);
          }
        }

        const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
        // End time is 2 hours after start (typical exam duration)
        const endDateTime = new Date(year, month - 1, day, hours + 2, minutes, 0);

        await addDoc(eventsRef, {
          userId: this.userId,
          name: `${exam.module} Exam`,
          description: `Exam for ${exam.module}`,
          category: 'Exam',
          start: Timestamp.fromDate(startDateTime),
          end: Timestamp.fromDate(endDateTime),
          colour: '#dc3545', // Red color for exams
          priority: 'High',
          source: 'firestore',
          synced: false,
          isRecurring: false,
          recurrenceRule: null,
          examId: exam.firebaseId, // Reference to the exam document
          location: null,
          locationName: '',
          gEventId: '',
          category: 'Exam',
        });
        console.log('Exam added to calendar:', exam.module, startDateTime);
      } catch (error) {
        console.error('Error adding exam to calendar:', error);
      }
    },
    async removeExamFromCalendar(exam) {
      // Remove the exam event from calendar
      try {
        const q = query(
          collection(db, 'events'),
          where('userId', '==', this.userId),
          where('examId', '==', exam.firebaseId)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        console.log('Exam removed from calendar');
      } catch (error) {
        console.error('Error removing exam from calendar:', error);
      }
    },
    saveData() {
      const data = {
        flashcards: this.flashcards,
        examDate: this.examDate,
        cardIdCounter: this.cardIdCounter
      };
      localStorage.setItem('studyToolsData', JSON.stringify(data));
    },
    loadData() {
      const saved = localStorage.getItem('studyToolsData');
      if (saved) {
        const data = JSON.parse(saved);
        this.flashcards = data.flashcards || [];
        this.examDate = data.examDate || '';
        this.cardIdCounter = data.cardIdCounter || 1;
      }
    },
    async clearAllFlashcards() {
      if (confirm('Are you sure you want to delete ALL flashcards? This cannot be undone.')) {
        try {
          if (this.userId) {
            // Delete all flashcards from Firebase
            for (const card of this.flashcards) {
              await deleteDoc(doc(db, 'flashcards', card.id));
            }
          }

          this.flashcards = [];
          this.cardIdCounter = 1;
          this.reviewMode = false;
          this.currentCardIndex = 0;

          // Save to localStorage as backup
          this.saveData();
          this.showToast('All flashcards have been cleared.');
        } catch (error) {
          console.error('Error clearing flashcards:', error);
          this.showToast('Error clearing flashcards: ' + error.message);
        }
      }
    },
    startEditCard(card) {
      this.editingCardId = card.id;
      this.editForm = {
        question: card.question,
        answer: card.answer,
        module: card.module || '',
        topic: card.topic || ''
      };
    },
    cancelEditCard() {
      this.editingCardId = null;
      this.editForm = { question: '', answer: '', module: '', topic: '' };
    },
    async saveEditCard() {
      const card = this.flashcards.find(c => c.id === this.editingCardId);
      if (card) {
        if (!this.editForm.question || !this.editForm.answer) {
          this.showToast('Please fill in both question and answer');
          return;
        }

        try {
          card.question = this.editForm.question;
          card.answer = this.editForm.answer;
          card.module = this.editForm.module;
          card.topic = this.editForm.topic;

          // Save to Firebase if authenticated
          if (this.userId && card.id) {
            await updateDoc(doc(db, 'flashcards', card.id), {
              question: card.question,
              answer: card.answer,
              module: card.module,
              topic: card.topic
            });
          } else {
            // Save to localStorage as backup
            this.saveData();
          }

          this.showToast('Flashcard updated');
          this.cancelEditCard();
        } catch (error) {
          console.error('Error saving flashcard:', error);
          this.showToast('Error saving flashcard: ' + error.message);
        }
      }
    },
    // Show Toast
    showToast(message) {
      this.toastMessage = message;
      const el = this.$refs.toastRef;
      if (!el) return;
      
      const t = bootstrap.Toast.getOrCreateInstance(el);
      t.show();
      
      setTimeout(() => {
        this.toastMessage = "";
      }, 3000);
    },
  },
  mounted() {
    // Set up authentication listener
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.userId = user.uid;
        console.log('User authenticated:', this.userId);

        // Load topics from Firebase
        this.loadTopics();

        // Load exams from Firebase
        this.loadExams();

        // Set up real-time listener for topics
        this.setupTopicsListener();

        // Set up real-time listener for flashcards (this will load flashcards automatically)
        this.setupFlashcardsListener();
      } else {
        this.userId = null;
        console.log('No user authenticated, using localStorage');

        // Load from localStorage if no user
        this.loadTopics();
        this.loadExams();
        this.loadFlashcards();
      }
    });

    // Initialize Bootstrap tooltips
    this.$nextTick(() => {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
    });
  },
  beforeUnmount() {
    // Clean up timer interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Clean up Firebase listeners
    if (this.unsubscribeTopics) {
      this.unsubscribeTopics();
    }

    // Clean up flashcards listener
    if (this.unsubscribeFlashcards) {
      this.unsubscribeFlashcards();
    }
  }
};
</script>

<template>
  <div class="study-app py-4 py-md-5">
    <div class="container main-container">
      <div class="mb-4 mb-md-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          <i class="fas fa-graduation-cap"></i> Study Tools
        </h1>
        <p class="text-muted fs-5">Manage your study topics, focus sessions, and flashcards.</p>
      </div>

      <!-- Topics Management Section -->
      <div class="card">
        <div class="card-header">
          <i class="fas fa-list-check"></i> Study Topics
        </div>
        <div class="card-body">
          <!-- Add New Topic Bar -->
          <div class="add-topic-section mb-4">
            <div class="row g-3 align-items-end">
              <div class="col-12 col-md-3">
                <label class="form-label">Module:</label>
                <select class="form-select" v-model="newTopic.module">
                  <option value="">Select Module</option>
                  <option v-for="module in modules" :key="module" :value="module">
                    {{ module }}
                  </option>
                  <option value="custom">+ Add Custom Module</option>
                </select>
              </div>
              <div class="col-md-3" v-if="newTopic.module === 'custom'">
                <label class="form-label">Custom Module Name:</label>
                <input type="text" class="form-control" v-model="customModuleName" placeholder="Enter module name...">
              </div>
              <div class="col-md-5">
                <label class="form-label">Topic:</label>
                <input type="text" class="form-control" v-model="newTopic.name" placeholder="Enter topic to study..."
                  @keyup.enter="addTopic">
              </div>
              <div class="col-lg-2 col-md-3" v-if="newTopic.module === 'custom'">
                <button class="btn add-button w-100 mt-3" @click="addTopic">
                  <i class="fas fa-plus"></i> Add Topic
                </button>
              </div>
              <div class="col-lg-2 col-md-3" v-else>
                <button class="btn add-button w-100" @click="addTopic">
                  <i class="fas fa-plus"></i> Add Topic
                </button>
              </div>
            </div>
          </div>

          <!-- Exam Dates Section -->
          <div class="exam-management mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0"><i class="fas fa-calendar-alt"></i> Exam Dates</h6>
              <div class="d-flex gap-2">
                <button class="btn btn-sm add-button" @click="showExamModal = true">
                  <i class="fas fa-plus"></i> Add Exam
                </button>
                <button v-if="exams.length > 0" class="btn btn-sm cancel-button" @click="deleteAllExams">
                  <i class="fas fa-trash-alt"></i> Delete All
                </button>
              </div>
            </div>
            <div v-if="exams.length > 0" class="exams-list">
              <div v-for="exam in exams" :key="exam.id"
                class="exam-item d-flex justify-content-between align-items-center mb-2 p-3 border rounded">
                <div>
                  <h6 class="mb-1">{{ exam.module }}</h6>
                  <small class="text-muted">
                    <i class="fas fa-calendar me-1"></i>
                    {{ formatExamDate(exam.date) }} at {{ exam.time }}
                  </small>
                </div>
                <button class="delete-button" @click="deleteExam(exam.id)" title="Delete this exam">
                  Delete
                </button>
              </div>
            </div>
            <div v-else class="text-center text-muted py-3">
              <i class="fas fa-calendar-times fa-2x mb-2"></i>
              <p>No exam dates scheduled yet.</p>
            </div>
          </div>

          <!-- Topic Checklist -->
          <div v-if="topics.length > 0" class="topics-checklist">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">Topic Checklist</h5>
              <div>
                <span class="badge bg-info me-2">
                  Progress: {{ completedTopicsCount }} / {{ topics.length }}
                </span>
                <button class="btn btn-sm cancel-button" @click="clearAllTopics">
                  <i class="fas fa-trash"></i> Clear All
                </button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress mb-3" style="height: 25px;">
              <div class="progress-bar bg-success" :style="{ width: topicsProgress + '%' }">
                {{ Math.round(topicsProgress) }}%
              </div>
            </div>

            <!-- Topics grouped by module -->
            <div v-for="module in topicsByModule" :key="module.name" class="module-group mb-3">
              <div class="module-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                  <i class="fas fa-folder"></i> {{ module.name }}
                  <span class="badge bg-secondary ms-2">{{ module.topics.length }}</span>
                </h6>
                <button class="delete-button" @click="deleteModule(module.name)"
                  title="Delete this module and all its topics">
                  Delete
                </button>
              </div>
              <div class="topic-list">
                <div v-for="topic in module.topics" :key="topic.id" class="topic-item"
                  :class="{ 'completed': topic.completed }">
                  <div class="form-check d-flex align-items-center">
                    <input class="form-check-input me-3" type="checkbox" :id="'topic-' + topic.id"
                      v-model="topic.completed" @change="updateTopicCompletion(topic)">
                    <label class="form-check-label flex-grow-1" :for="'topic-' + topic.id"
                      :style="{ textDecoration: topic.completed ? 'line-through' : 'none' }">
                      {{ topic.name }}
                    </label>
                    <small class="text-muted me-3">
                      {{ formatTopicDate(topic.addedDate) }}
                    </small>
                    <button class="delete-button" @click="deleteTopic(topic.id, topic.name)" title="Delete this topic">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center text-muted py-4">
            <i class="fas fa-clipboard-list fa-3x mb-3"></i>
            <p>No topics yet. Add your first study topic to get started!</p>
          </div>
        </div>
      </div>

      <!-- Pomodoro Timer Section -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <i class="fas fa-clock"></i> Pomodoro Timer
          </div>
          <div class="feature-help-section">
            <button class="help-button-header" @mouseover="showPomodoroHelp = true"
              @mouseleave="showPomodoroHelp = false">
              <i class="fas fa-question-circle front-icon"></i>
            </button>
            <div v-if="showPomodoroHelp" class="help-tooltip-header">
              <h6>🎯 How Pomodoro Helps You Study Better:</h6>
              <ul class="text-start">
                <li><strong>Fights Procrastination:</strong> Breaking work into 25-minute chunks makes
                  starting less daunting</li>
                <li><strong>Maintains Focus:</strong> Short bursts align with your brain's natural
                  attention span</li>
                <li><strong>Prevents Burnout:</strong> Regular breaks keep your mind fresh and prevent
                  mental fatigue</li>
                <li><strong>Improves Time Awareness:</strong> Helps you understand how long tasks
                  actually take</li>
                <li><strong>Reduces Distractions:</strong> Knowing you only need to focus for 25 minutes
                  makes it easier to ignore interruptions</li>
                <li><strong>Builds Momentum:</strong> Completing pomodoros gives a sense of achievement
                  that motivates continued study</li>
              </ul>
              <p class="mb-0 mt-2"><em>Tip: Start with 2-3 pomodoros per study session and gradually
                  increase!</em></p>
            </div>
          </div>
        </div>
        <div class="card-body text-center">
          <!-- Preset Timers -->
          <div class="mb-4">
            <h5>Quick Select (minutes):</h5>
            <button class="btn btn-outline-primary preset-btn" :class="{ active: selectedPreset === 'pomodoro' }"
              @click="setPreset('pomodoro')">
              Classic (25/5)
            </button>
            <button class="btn btn-outline-primary preset-btn" :class="{ active: selectedPreset === 'short' }"
              @click="setPreset('short')">
              Short (15/3)
            </button>
            <button class="btn btn-outline-primary preset-btn" :class="{ active: selectedPreset === 'long' }"
              @click="setPreset('long')">
              Long (50/10)
            </button>
            <button class="btn btn-outline-primary preset-btn" :class="{ active: selectedPreset === 'custom' }"
              @click="selectedPreset = 'custom'">
              Custom
            </button>
          </div>

          <!-- Custom Timer Inputs -->
          <div v-if="selectedPreset === 'custom'" class="mb-4">
            <div class="row justify-content-center">
              <div class="col-md-4">
                <label class="form-label">Study Time (minutes):</label>
                <input type="number" class="form-control" v-model.number="customStudy" min="1" max="120">
              </div>
              <div class="col-md-4">
                <label class="form-label">Break Time (minutes):</label>
                <input type="number" class="form-control" v-model.number="customBreak" min="1" max="30">
              </div>
            </div>
            <button class="btn btn-success mt-3" @click="setCustomTimer">
              Apply Custom Timer
            </button>
          </div>

          <!-- Timer Display -->
          <div class="timer-display">
            {{ formattedTime }}
          </div>
          <div class="mb-3">
            <h5 :style="{ color: isBreak ? '#28a745' : '#667eea' }">
              {{ isBreak ? '☕ Break Time' : '📚 Study Time' }}
            </h5>
          </div>

          <!-- Timer Controls -->
          <button class="btn start-button timer-btn" @click="startTimer" v-if="!isRunning">
            <i class="fas fa-play"></i> Start
          </button>
          <button class="btn pause-button timer-btn" @click="pauseTimer" v-if="isRunning">
            <i class="fas fa-pause"></i> Pause
          </button>
          <button class="btn cancel-button timer-btn" style="border-radius: 100px;" @click="resetTimer">
            <i class="fas fa-redo"></i> Reset
          </button>
        </div>
      </div>

      <!-- Flashcards Section -->
      <div class="card mb-0">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <i class="fas fa-brain"></i> Spaced Repetition Flashcards
          </div>
          <div class="feature-help-section">
            <button class="help-button-header" @mouseover="showSpacedRepHelp = true"
              @mouseleave="showSpacedRepHelp = false">
              <i class="fas fa-question-circle front-icon"></i>
            </button>
            <div v-if="showSpacedRepHelp" class="help-tooltip-header">
              <h6>🧠 How Spaced Repetition Boosts Memory:</h6>
              <ul class="text-start">
                <li><strong>Fights the Forgetting Curve:</strong> Reviews information right before you'd
                  naturally forget it</li>
                <li><strong>Strengthens Long-term Memory:</strong> Each review moves knowledge deeper
                  into permanent memory</li>
                <li><strong>Optimizes Study Time:</strong> Focus on difficult cards more often, easy
                  ones less frequently</li>
                <li><strong>Active Recall Practice:</strong> Testing yourself is proven more effective
                  than re-reading notes</li>
                <li><strong>Reduces Cramming:</strong> Spreads learning over time for better retention
                  than last-minute studying</li>
                <li><strong>Builds Confidence:</strong> Regular successful recalls boost your confidence
                  for exams</li>
              </ul>
              <p class="mb-0 mt-2"><em>Research shows: Spaced repetition can improve retention by up to
                  200% compared to massed practice!</em></p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Add Flashcard Form -->
          <div class="mb-4">
            <button class="btn add-button" @click="toggleAddCard()">
              <i class="fas fa-plus"></i> Add New Flashcard
            </button>
          </div>

          <div v-if="showAddCard" class="add-flashcard mb-4 p-3 border rounded">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Module:</label>
                <select class="form-select" v-model="newCard.module">
                  <option value="">Select Module</option>
                  <option v-for="module in modules" :key="module" :value="module">
                    {{ module }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Topic:</label>
                <select class="form-select" v-model="newCard.topic" :disabled="!newCard.module">
                  <option value="">Select Topic</option>
                  <option v-for="topic in getTopicsForModule(newCard.module)" :key="topic.id" :value="topic.name">
                    {{ topic.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="mb-3 mt-3">
              <label class="form-label">Question/Front:</label>
              <input type="text" class="form-control" v-model="newCard.question" placeholder="Enter question...">
            </div>
            <div class="mb-3">
              <label class="form-label">Answer/Back:</label>
              <textarea class="form-control" v-model="newCard.answer" rows="3" placeholder="Enter answer..."></textarea>
            </div>
            <button class="btn start-button" @click="addFlashcard">
              <i class="fas fa-save"></i> Save Card
            </button>
            <button class="btn cancel-button ms-2" @click="showAddCard = false">
              Cancel
            </button>
          </div>

          <!-- All Cards Available for Review -->
          <div v-if="allCards.length > 0">
            <div v-if="!reviewMode">
              <h5 class="mb-3">
                <span class="badge bg-primary">{{ allCards.length }}</span> Total Flashcards
                <span v-if="dueCards.length > 0" class="ms-2">
                  <br class="d-inline d-sm-none my-2">
                  <span class="badge bg-danger">{{ dueCards.length }}</span> Due for Review
                </span>
              </h5>

              <!-- Module and Topic Filters -->
              <div class="row g-3 mb-3">
                <div v-if="availableModulesInFlashcards.length > 0" class="col-md-6">
                  <label class="form-label">Filter Review by Module:</label>
                  <select class="form-select" v-model="selectedModuleFilter">
                    <option value="all">All Modules</option>
                    <option v-for="module in availableModulesInFlashcards" :key="module" :value="module">
                      {{ module }}
                    </option>
                  </select>
                </div>
                <div v-if="availableTopicsInFlashcards.length > 0" class="col-md-6">
                  <label class="form-label">Filter Review by Topic:</label>
                  <select class="form-select" v-model="selectedTopicFilter">
                    <option value="all">All Topics</option>
                    <option v-for="topic in availableTopicsInFlashcards" :key="topic" :value="topic">
                      {{ topic }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="d-flex gap-3 flex-wrap">
                <button class="btn add-button btn-lg" @click="startReview" :disabled="filteredDueCards.length === 0">
                  <i class="fas fa-play"></i> Review Due Cards ({{ filteredDueCards.length }})
                </button>
                <button class="btn start-button btn-lg" @click="startAllCardsReview">
                  <i class="fas fa-layer-group"></i> Review All Cards ({{ filteredAllCards.length }})
                </button>
              </div>
            </div>

            <div v-else>
              <div class="mb-3">
                <h5>
                  <span v-if="singleCardMode">
                    <i class="fas fa-eye"></i> Reviewing Single Card
                  </span>
                  <span v-else>
                    Review Progress: {{ currentCardIndex + 1 }} / {{ reviewCards.length }}
                  </span>
                </h5>
                <div v-if="!singleCardMode" class="progress" style="height: 25px;">
                  <div class="progress-bar" :style="{ width: reviewProgress + '%' }">
                    {{ Math.round(reviewProgress) }}%
                  </div>
                </div>
              </div>

              <div class="flashcard" :class="{ 'flipping': currentCard.isFlipping }" @click="flipCurrentCard">
                <div class="flashcard-content">
                  <div v-if="!currentCard.flipped">
                    <strong>Question:</strong><br>
                    <span class="preserve-newlines">{{ currentCard.question }}</span>
                    <p class="text-muted mt-3"><small>Click to reveal answer</small></p>
                  </div>
                  <div v-else>
                    <strong>Answer:</strong><br>
                    <span class="preserve-newlines">{{ currentCard.answer }}</span>
                  </div>
                </div>
                <div v-if="currentCard.flipped" class="mt-3">
                  <p class="text-muted">How well did you know this?</p>
                  <button class="btn btn-danger btn-sm me-2" @click.stop="rateCurrentCard('hard')">
                    Hard (1 day)
                  </button>
                  <button class="btn btn-warning btn-sm me-2" @click.stop="rateCurrentCard('medium')">
                    Medium (3 days)
                  </button>
                  <button class="btn btn-success btn-sm" @click.stop="rateCurrentCard('easy')">
                    Easy (7 days)
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <button class="btn btn-secondary" @click="endReview">
                  <i class="fas fa-stop"></i> End Review Session
                </button>
              </div>
            </div>
          </div>

          <!-- All Flashcards List -->
          <div v-if="!reviewMode && allCards.length > 0" class="mt-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="mb-0">
                All Flashcards
              </h5>
              <button class="btn btn-outline-secondary" @click="showAllAnswers = !showAllAnswers">
                <i class="fas" :class="showAllAnswers ? 'fa-eye-slash' : 'fa-eye'"></i>
                {{ showAllAnswers ? 'Hide All Answers' : 'Show All Answers' }}
              </button>
            </div>
            <div class="list-group">
              <div v-for="card in allCards" :key="card.id" class="list-group-item flashcard-list-item">
                <!-- Normal View -->
                <div v-if="editingCardId !== card.id">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                      <div v-if="card.module || card.topic" class="small text-muted mb-1">
                        <span v-if="card.module" class="badge bg-secondary me-1">{{ card.module
                        }}</span>
                        <span v-if="card.topic" class="badge bg-info">{{ card.topic }}</span>
                      </div>
                      <div class="mb-2">
                        <strong>Q:</strong> <span class="preserve-newlines">{{ card.question
                        }}</span>
                      </div>
                      <div v-if="showAllAnswers" class="mb-2 text-success">
                        <strong>A:</strong> <span class="preserve-newlines">{{ card.answer
                        }}</span>
                      </div>
                      <small class="text-muted d-block">
                        {{ card.nextReview <= new Date().toISOString().split('T')[0] ? 'Due for review'
                          : 'Next review in ' + daysUntil(card.nextReview) + ' days' }} </small>
                    </div>
                    <div class="d-flex flex-column align-items-end gap-2 ms-3">
                      <span class="badge review-badge" :class="getBadgeClass(card.nextReview)">
                        {{ formatDate(card.nextReview) }}
                      </span>
                      <button class="use-button" @click="startSingleCardReview(card.id)">
                        Use
                      </button>
                      <button class="edit-button" @click="startEditCard(card)">
                        Edit
                      </button>
                      <button class="delete-button" @click="deleteCard(card.id)" title="Delete this flashcard">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Edit View -->
                <div v-else class="edit-card-form">
                  <div class="row g-3 mb-3">
                    <div class="col-md-6">
                      <label class="form-label">Module:</label>
                      <select class="form-select" v-model="editForm.module">
                        <option value="">Select Module</option>
                        <option v-for="module in modules" :key="module" :value="module">
                          {{ module }}
                        </option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Topic:</label>
                      <select class="form-select" v-model="editForm.topic" :disabled="!editForm.module">
                        <option value="">Select Topic</option>
                        <option v-for="topic in getTopicsForModule(editForm.module)" :key="topic.id"
                          :value="topic.name">
                          {{ topic.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Question:</label>
                    <input type="text" class="form-control" v-model="editForm.question" placeholder="Enter question...">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Answer:</label>
                    <textarea class="form-control" v-model="editForm.answer" rows="3"
                      placeholder="Enter answer..."></textarea>
                  </div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-success" @click="saveEditCard">
                      <i class="fas fa-save"></i> Save
                    </button>
                    <button class="btn btn-secondary" @click="cancelEditCard">
                      <i class="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="flashcards.length === 0" class="text-center text-muted py-5">
            <i class="fas fa-inbox fa-3x mb-3"></i>
            <p>No flashcards yet. Add your first card to get started!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Exam Modal -->
    <div class="modal" :class="{ show: showExamModal }" :style="{ display: showExamModal ? 'block' : 'none' }">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add Exam Date</h5>
            <button type="button" class="btn-close btn-close-white" @click="closeExamModal"></button>
          </div>
          <div class="modal-body">
            <!-- Image Upload Section -->
            <div class="mb-4 p-3 border rounded bg-light">
              <label class="form-label fw-bold">
                <i class="fas fa-image"></i> Upload Exam Timetable Image
              </label>

              <!-- Instructions -->
              <div class="alert alert-info mb-3" role="alert">
                <strong>How to use:</strong>
                <ul class="mb-0 mt-2">
                  <li>Take a screenshot of your exam timetable (like the example below)</li>
                  <li>Upload the image file</li>
                  <li>The system will automatically extract all exam details</li>
                  <li>Review and add exams with a single click</li>
                </ul>
              </div>

              <!-- Example Image -->
              <div class="mb-3 p-2 border rounded bg-white">
                <p class="text-muted small mb-2">
                  <strong>Example:</strong> Your exam timetable should look like this
                </p>
                <img :src="exampleTimetableImage" alt="Example exam timetable" class="img-fluid rounded border"
                  style="max-height: 400px;">
              </div>

              <input ref="examImageInput" type="file" class="form-control mb-2" accept="image/*"
                @change="handleImageUpload" :disabled="isProcessingImage">
              <small class="text-muted d-block mb-2">
                <i class="fas fa-info-circle"></i> Upload a screenshot of your exam timetable to
                automatically extract exam details
              </small>

              <!-- Processing indicator -->
              <div v-if="isProcessingImage" class="text-center my-3">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Processing...</span>
                </div>
                <p class="mt-2">Processing image... {{ ocrProgress }}%</p>
              </div>

              <!-- Preview uploaded image -->
              <div v-if="uploadedImage && !isProcessingImage" class="mt-2">
                <img :src="uploadedImage" class="img-fluid rounded" style="max-height: 200px;" alt="Uploaded timetable">
              </div>

              <!-- OCR Debug Output -->
              <div v-if="ocrDebugText && parsedExams.length === 0" class="mt-3">
                <details class="mb-2">
                  <summary class="text-muted" style="cursor: pointer;">
                    <small>Debug: Show OCR extracted text</small>
                  </summary>
                  <pre class="mt-2 p-2 bg-white border rounded"
                    style="max-height: 200px; overflow-y: auto; font-size: 0.8rem;">{{ ocrDebugText }}</pre>
                </details>
              </div>

              <!-- Parsed exams preview -->
              <div v-if="parsedExams.length > 0" class="mt-3">
                <p class="fw-bold text-success mb-2">
                  <i class="fas fa-check-circle"></i> Found {{ parsedExams.length }} exam(s)
                </p>

                <!-- Individual exam cards -->
                <div class="parsed-exams-list">
                  <div v-for="(exam, index) in parsedExams" :key="index" class="card mb-2 border-success">
                    <div class="card-body p-2">
                      <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                          <strong>{{ exam.module || 'No module' }}</strong>
                          <div class="small text-muted">
                            <span v-if="exam.date">Date: {{ exam.date }}</span>
                            <span v-else>No date</span>
                            <span v-if="exam.time" class="ms-2">Time: {{ exam.time }}</span>
                          </div>
                        </div>
                        <button class="btn btn-sm btn-success ms-2" @click="addSingleParsedExam(exam)">
                          <i class="fas fa-plus"></i> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button class="btn btn-sm btn-success w-100 mt-2" @click="addAllParsedExams">
                  <i class="fas fa-plus"></i> Add All {{ parsedExams.length }} Exams
                </button>
              </div>
            </div>

            <div class="text-center mb-3">
              <strong>- OR -</strong>
            </div>

            <!-- Manual Entry Section -->
            <div class="mb-3">
              <label class="form-label">Module:</label>
              <select class="form-select" v-model="newExam.module">
                <option value="">Select Module</option>
                <option v-for="module in modules" :key="module" :value="module">
                  {{ module }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Exam Date:</label>
              <input type="date" class="form-control" v-model="newExam.date">
            </div>
            <div class="mb-3">
              <label class="form-label">Exam Time:</label>
              <input type="time" class="form-control" v-model="newExam.time">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn cancel-button" @click="closeExamModal">
              Cancel
            </button>
            <button type="button" class="btn save-button" @click="addExam">
              Add Exam
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-show="toastMessage" ref="toastRef" class="toast-custom" role="alert"
      aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
      <div class="toast-body">
        {{ toastMessage }}
      </div>
    </div>

  </div>
</template>

<style scoped>
h1 {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.study-app {
  min-height: 100vh;
}

.card {
  border: none;
  border-radius: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  background-color: #f5f5f5;
  margin-bottom: 2rem;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.card-body {
  overflow: hidden;
}

.card-header {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0.75rem 0.75rem 0 0;
  padding: 1.5rem;
  font-weight: 600;
  font-size: 1.3rem;
}

/* Topics Styles */
.add-topic-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
}

/* Module Management Styles */
.module-management {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
}

.module-list-container {
  background: white;
  max-height: 300px;
  overflow-y: auto;
}

.module-item {
  background: #f8f9fa;
  border-radius: 5px;
  transition: all 0.3s;
}

.module-item:hover {
  background: #e9ecef;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.module-name {
  color: #667eea;
  font-weight: 500;
}

/* Delete Module Button (matches topic delete style) */
.delete-module-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  transition: all 0.3s;
  font-size: 20px;
  font-weight: bold;
  color: white !important;
}

.delete-module-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
  background-color: #c82333;
  border-color: #bd2130;
}

/* Exam Management Styles */
.exam-management {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
}

.exams-list {
  max-height: 400px;
  overflow-y: auto;
}

.exam-item {
  background: white;
  transition: all 0.3s;
}

.exam-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.exam-item h6 {
  color: #667eea;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.module-group {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
}

.module-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #dee2e6;
}

.module-header h6 {
  color: #667eea;
  font-weight: 600;
}

.topic-list {
  padding-left: 1rem;
}

.topic-item {
  background: white;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s;
}

.topic-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.topic-item.completed {
  background: #e8f5e9;
}

.form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #28a745;
  border-color: #28a745;
}

/* Delete Topic Button */
.delete-topic-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  transition: all 0.3s;
  font-size: 20px;
  font-weight: bold;
  color: white !important;
}

.delete-topic-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
  background-color: #c82333;
  border-color: #bd2130;
}

.delete-x {
  color: white !important;
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
}

/* Timer Styles */
.timer-display {
  font-size: 4rem;
  font-weight: 700;
  color: #667eea;
  margin: 2rem 0;
  font-family: 'Courier New', monospace;
}

.timer-btn {
  margin: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-weight: 600;
  transition: all 0.3s;
}

.timer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.preset-btn {
  margin: 0.5rem;
  border-radius: 20px;
  padding: 0.5rem 1.5rem;
}

.preset-btn.active {
  background-color: #667eea;
  color: white;
}

/* Flashcard Styles */
.flashcard {
  min-height: 200px;
  background: white;
  border-radius: 15px;
  padding: 2rem;
  margin: 1rem 0;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transform-style: preserve-3d;
  position: relative;
  perspective: 1200px;
  transition: box-shadow 0.3s ease;
}

.flashcard:hover:not(.flipping) {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
}

.flashcard.flipping {
  animation: flipCard 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.flashcard-content {
  font-size: 1.5rem;
  color: #333;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-backface-visibility: hidden;
}

.review-badge {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
}

.cursor-pointer {
  cursor: pointer;
}

.flashcard-list-item {

  transition: background-color 0.2s, transform 0.6s;
  transform-style: preserve-3d;
}

.flashcard-list-item:hover {
  background-color: #f8f9fa;
}

.flashcard-list-item.flipping {
  animation: flipCard 0.6s ease-in-out;
}

/* Edit Card Form */
.edit-card-form {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
  border: 2px solid #667eea;
}

@keyframes flipCard {
  0% {
    transform: rotateY(0deg) scale(1);
  }

  50% {
    transform: rotateY(90deg) scale(0.95);
  }

  100% {
    transform: rotateY(180deg) scale(1);
  }
}

.answer-section {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal.show {
  display: block;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-backdrop.show {
  opacity: 0.5;
}

.modal-header {
  background-color: #667eea;
  color: white;
}

/* Help Button and Tooltip Styles */
.feature-help-section {
  position: relative;
  display: inline-block;
}

.help-button-header {
  color: #667eea;
  border: 2px solid #ffd700;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: bold;
  cursor: help;
  transition: all 0.3s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.front-icon {
  z-index: 9999;
  font-size: 28px;
  cursor: pointer;
}

.help-button-header:hover {
  background: #ffd700;
  transform: scale(1.1);
  color: #667eea;
}

.help-button-header i {
  color: #667eea !important;
  font-size: 18px;
}

.help-tooltip-header {
  position: absolute;
  background: white;
  border: 2px solid #667eea;
  border-radius: 15px;
  padding: 20px;
  width: 450px;
  max-width: calc(100vw - 40px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeIn 0.3s;
  bottom: calc(100% + 10px);
  right: -10px;
  transform: translateY(0);
}

@media (max-width: 768px) {
  .help-tooltip-header {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    width: 90vw;
    bottom: calc(100% + 10px);
  }
}

.help-tooltip-header::before {
  content: '';
  position: absolute;
  bottom: -12px;
  right: 20px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #667eea;
}

.help-tooltip-header h6 {
  color: #667eea;
  margin-bottom: 15px;
  font-weight: 700;
}

.help-tooltip-header ul {
  margin-bottom: 0;
}

.help-tooltip-header li {
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.help-tooltip-header li strong {
  color: #667eea;
}

.help-tooltip-header em {
  color: #28a745;
  font-weight: 600;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-5px);
    }

    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
}

/* Progress Bar Styles */
.progress {
  background-color: #e9ecef;
  border-radius: 10px;
}

.progress-bar {
  font-weight: 600;
  transition: width 0.6s ease;
}

/* Preserve Newlines in Text */
.preserve-newlines {
  white-space: pre-wrap;
  word-wrap: break-word;
  display: inline-block;
  text-align: left;
}

/* Gradient Button Styles */
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
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.add-button {
  background: linear-gradient(120deg, #0d6efd 0%, #0056b3 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.add-button:hover {
  background: linear-gradient(120deg, #0d6efd 0%, #0056b3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #0d6efd;
  box-shadow: 0 8px 16px rgba(13, 110, 253, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.start-button {
  background: linear-gradient(120deg, #198754 0%, #145235 100%);
  color: white;
  border-radius: 100px;
  transition: all 0.3s ease;
}

.start-button:hover {
  background: linear-gradient(120deg, #198754 0%, #145235 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #198754;
  box-shadow: 0 8px 16px rgba(25, 135, 84, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.pause-button {
  background: linear-gradient(120deg, #ffc107 0%, #fd7e14 100%);
  color: white;
  border-radius: 100px;
  transition: all 0.3s ease;
}

.pause-button:hover {
  background: linear-gradient(120deg, #ffc107 0%, #fd7e14 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #ffc107;
  box-shadow: 0 8px 16px rgba(25, 135, 84, 0.4);
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
  border: 1px solid #ff6b6b;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.delete-button {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
  border: none;
  padding: 0.2rem 0.2rem;
  font-size: 0.9rem;
  min-width: 70px;
}

.delete-button:hover {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #ff6b6b;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.edit-button {
  background: linear-gradient(120deg, #ffa500 0%, #ff8c00 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
  border: none;
  padding: 0.2rem 0.2rem;
  font-size: 0.9rem;
  min-width: 70px;
}

.edit-button:hover {
  background: linear-gradient(120deg, #ffa500 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #ffa500;
  box-shadow: 0 8px 16px rgba(255, 165, 0, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.use-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
  border: none;
  padding: 0.2rem 0.2rem;
  font-size: 0.9rem;
  min-width: 70px;
}

.use-button:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.btn-success,
.btn-primary,
.btn-secondary,
.btn-danger,
.btn-warning {
  border-radius: 20px;
  transition: all 0.3s ease;
}

.btn-success:hover,
.btn-primary:hover,
.btn-secondary:hover,
.btn-danger:hover,
.btn-warning:hover {
  background: white;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
  background-clip: unset;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
}

.btn-success:hover {
  color: #28a745;
}

.btn-primary:hover {
  color: #0d6efd;
}

.btn-secondary:hover {
  color: #6c757d;
}

.btn-danger:hover {
  color: #dc3545;
}

.btn-warning:hover {
  color: #ffc107;
}

/* Toast Notification Styles */
.toast-custom {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.25rem; 
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  min-width: 300px;
  max-width: 90vw;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: opacity, transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 576px) {
  .toast-custom {
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    transform: none;
    min-width: unset;
    max-width: 100%;
    width: calc(100% - 1rem);
    border-radius: 6px;
    padding: 0.6rem 1rem;
  }
}

@media (min-width: 768px) {
  .toast-custom {
    min-width: 350px;
  }
}
</style>