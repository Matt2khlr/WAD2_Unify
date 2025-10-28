<template>
	<div class="study-app">
		<div class="container main-container">
			<h1 class="text-center text-black mb-4">
				<i class="fas fa-graduation-cap"></i> Study Tools
			</h1>

			<!-- Topics Management Section -->
			<div class="card">
				<div class="card-header">
					<i class="fas fa-list-check"></i> Study Topics
				</div>
				<div class="card-body">
					<!-- Add New Topic Bar -->
					<div class="add-topic-section mb-4">
						<div class="row align-items-end">
							<div class="col-md-3">
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
								<input 
									type="text" 
									class="form-control" 
									v-model="customModuleName"
									placeholder="Enter module name..."
								>
							</div>
							<div class="col-md-5">
								<label class="form-label">Topic:</label>
								<input 
									type="text" 
									class="form-control" 
									v-model="newTopic.name"
									placeholder="Enter topic to study..."
									@keyup.enter="addTopic"
								>
							</div>
							<div class="col-md-2">
								<button class="btn btn-primary w-100" @click="addTopic">
									<i class="fas fa-plus"></i> Add Topic
								</button>
							</div>
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
								<button class="btn btn-sm btn-outline-danger" @click="clearAllTopics">
									<i class="fas fa-trash"></i> Clear All
								</button>
							</div>
						</div>

						<!-- Progress Bar -->
						<div class="progress mb-3" style="height: 25px;">
							<div 
								class="progress-bar bg-success" 
								:style="{width: topicsProgress + '%'}"
							>
								{{ Math.round(topicsProgress) }}%
							</div>
						</div>

						<!-- Topics grouped by module -->
						<div v-for="module in topicsByModule" :key="module.name" class="module-group mb-3">
							<h6 class="module-header">
								<i class="fas fa-folder"></i> {{ module.name }}
								<span class="badge bg-secondary ms-2">{{ module.topics.length }}</span>
							</h6>
							<div class="topic-list">
								<div 
									v-for="topic in module.topics" 
									:key="topic.id"
									class="topic-item"
									:class="{ 'completed': topic.completed }"
								>
									<div class="form-check d-flex align-items-center">
										<input 
											class="form-check-input me-3" 
											type="checkbox" 
											:id="'topic-' + topic.id"
											v-model="topic.completed"
											@change="saveTopics"
										>
										<label 
											class="form-check-label flex-grow-1" 
											:for="'topic-' + topic.id"
											:style="{ textDecoration: topic.completed ? 'line-through' : 'none' }"
										>
											{{ topic.name }}
										</label>
										<small class="text-muted me-3">
											{{ formatTopicDate(topic.addedDate) }}
										</small>
										<button 
											class="btn btn-danger delete-topic-btn"
											@click="deleteTopic(topic.id, topic.name)"
											title="Delete this topic"
										>
											<span class="delete-x">X</span>
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
						<button class="help-button-header" @mouseover="showPomodoroHelp = true" @mouseleave="showPomodoroHelp = false">
							<i class="fas fa-question-circle front-icon"></i>
						</button>
						<div v-if="showPomodoroHelp" class="help-tooltip-header">
							<h6>🎯 How Pomodoro Helps You Study Better:</h6>
							<ul class="text-start">
								<li><strong>Fights Procrastination:</strong> Breaking work into 25-minute chunks makes starting less daunting</li>
								<li><strong>Maintains Focus:</strong> Short bursts align with your brain's natural attention span</li>
								<li><strong>Prevents Burnout:</strong> Regular breaks keep your mind fresh and prevent mental fatigue</li>
								<li><strong>Improves Time Awareness:</strong> Helps you understand how long tasks actually take</li>
								<li><strong>Reduces Distractions:</strong> Knowing you only need to focus for 25 minutes makes it easier to ignore interruptions</li>
								<li><strong>Builds Momentum:</strong> Completing pomodoros gives a sense of achievement that motivates continued study</li>
							</ul>
							<p class="mb-0 mt-2"><em>Tip: Start with 2-3 pomodoros per study session and gradually increase!</em></p>
						</div>
					</div>
				</div>
				<div class="card-body text-center">
					<!-- Preset Timers -->
					<div class="mb-4">
						<h5>Quick Select (minutes):</h5>
						<button 
							class="btn btn-outline-primary preset-btn" 
							:class="{active: selectedPreset === 'pomodoro'}" 
							@click="setPreset('pomodoro')"
						>
							Classic (25/5)
						</button>
						<button 
							class="btn btn-outline-primary preset-btn" 
							:class="{active: selectedPreset === 'short'}" 
							@click="setPreset('short')"
						>
							Short (15/3)
						</button>
						<button 
							class="btn btn-outline-primary preset-btn" 
							:class="{active: selectedPreset === 'long'}" 
							@click="setPreset('long')"
						>
							Long (50/10)
						</button>
						<button 
							class="btn btn-outline-primary preset-btn" 
							:class="{active: selectedPreset === 'custom'}" 
							@click="selectedPreset = 'custom'"
						>
							Custom
						</button>
					</div>

					<!-- Custom Timer Inputs -->
					<div v-if="selectedPreset === 'custom'" class="mb-4">
						<div class="row justify-content-center">
							<div class="col-md-4">
								<label class="form-label">Study Time (minutes):</label>
								<input 
									type="number" 
									class="form-control" 
									v-model.number="customStudy" 
									min="1" 
									max="120"
								>
							</div>
							<div class="col-md-4">
								<label class="form-label">Break Time (minutes):</label>
								<input 
									type="number" 
									class="form-control" 
									v-model.number="customBreak" 
									min="1" 
									max="30"
								>
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
						<h5 :style="{color: isBreak ? '#28a745' : '#667eea'}">
							{{ isBreak ? '☕ Break Time' : '📚 Study Time' }}
						</h5>
					</div>

					<!-- Timer Controls -->
					<button 
						class="btn btn-success timer-btn" 
						@click="startTimer" 
						v-if="!isRunning"
					>
						<i class="fas fa-play"></i> Start
					</button>
					<button 
						class="btn btn-warning timer-btn" 
						@click="pauseTimer" 
						v-if="isRunning"
					>
						<i class="fas fa-pause"></i> Pause
					</button>
					<button class="btn btn-danger timer-btn" @click="resetTimer">
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
						<button class="help-button-header" @mouseover="showSpacedRepHelp = true" @mouseleave="showSpacedRepHelp = false">
							<i class="fas fa-question-circle front-icon"></i>
						</button>
						<div v-if="showSpacedRepHelp" class="help-tooltip-header">
							<h6>🧠 How Spaced Repetition Boosts Memory:</h6>
							<ul class="text-start">
								<li><strong>Fights the Forgetting Curve:</strong> Reviews information right before you'd naturally forget it</li>
								<li><strong>Strengthens Long-term Memory:</strong> Each review moves knowledge deeper into permanent memory</li>
								<li><strong>Optimizes Study Time:</strong> Focus on difficult cards more often, easy ones less frequently</li>
								<li><strong>Active Recall Practice:</strong> Testing yourself is proven more effective than re-reading notes</li>
								<li><strong>Reduces Cramming:</strong> Spreads learning over time for better retention than last-minute studying</li>
								<li><strong>Builds Confidence:</strong> Regular successful recalls boost your confidence for exams</li>
							</ul>
							<p class="mb-0 mt-2"><em>Research shows: Spaced repetition can improve retention by up to 200% compared to massed practice!</em></p>
						</div>
					</div>
				</div>
				<div class="card-body">
					<!-- Add Flashcard Form -->
					<div class="mb-4">
						<button class="btn btn-primary" @click="showAddCard = !showAddCard">
							<i class="fas fa-plus"></i> Add New Flashcard
						</button>
						<button class="btn btn-secondary ms-2" @click="showExamDateModal = true">
							<i class="fas fa-calendar"></i> Set Exam Date
						</button>
						<span v-if="examDate" class="ms-3 badge bg-info">
							Exam: {{ examDate }}
						</span>
					</div>

					<div v-if="showAddCard" class="mb-4 p-3 border rounded">
						<div class="mb-3">
							<label class="form-label">Question/Front:</label>
							<input 
								type="text" 
								class="form-control" 
								v-model="newCard.question" 
								placeholder="Enter question..."
							>
						</div>
						<div class="mb-3">
							<label class="form-label">Answer/Back:</label>
							<textarea 
								class="form-control" 
								v-model="newCard.answer" 
								rows="3" 
								placeholder="Enter answer..."
							></textarea>
						</div>
						<button class="btn btn-success" @click="addFlashcard">
							<i class="fas fa-save"></i> Save Card
						</button>
						<button class="btn btn-secondary ms-2" @click="showAddCard = false">
							Cancel
						</button>
					</div>

					<!-- Due Cards -->
					<div v-if="dueCards.length > 0">
						<div v-if="!reviewMode">
							<h5 class="mb-3">
								<span class="badge bg-danger">{{ dueCards.length }}</span> Cards Due for Review
							</h5>
							<button class="btn btn-primary btn-lg" @click="startReview">
								<i class="fas fa-play"></i> Start Review Session
							</button>
						</div>

						<div v-else>
							<div class="mb-3">
								<h5>
									Review Progress: {{ currentCardIndex + 1 }} / {{ dueCards.length }}
								</h5>
								<div class="progress" style="height: 25px;">
									<div class="progress-bar" :style="{width: reviewProgress + '%'}">
										{{ Math.round(reviewProgress) }}%
									</div>
								</div>
							</div>

							<div class="flashcard" @click="flipCurrentCard">
								<div class="flashcard-content">
									<div v-if="!currentCard.flipped">
										<strong>Question:</strong><br>{{ currentCard.question }}
										<p class="text-muted mt-3"><small>Click to reveal answer</small></p>
									</div>
									<div v-else>
										<strong>Answer:</strong><br>{{ currentCard.answer }}
									</div>
								</div>
								<div v-if="currentCard.flipped" class="mt-3">
									<p class="text-muted">How well did you know this?</p>
									<button 
										class="btn btn-danger btn-sm me-2" 
										@click.stop="rateCurrentCard('hard')"
									>
										Hard (1 day)
									</button>
									<button 
										class="btn btn-warning btn-sm me-2" 
										@click.stop="rateCurrentCard('medium')"
									>
										Medium (3 days)
									</button>
									<button 
										class="btn btn-success btn-sm" 
										@click.stop="rateCurrentCard('easy')"
									>
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

<!-- Upcoming Reviews -->
					<div v-if="upcomingCards.length > 0" class="mt-4">
						<h5 class="mb-3">
							<span class="badge bg-info">{{ upcomingCards.length }}</span> Upcoming Reviews
						</h5>
						<div class="list-group">
							<div 
								v-for="card in upcomingCards" 
								:key="card.id" 
								class="list-group-item"
							>
								<div class="d-flex justify-content-between align-items-center">
									<div class="flex-grow-1">
										<strong>{{ card.question }}</strong>
										<br>
										<small class="text-muted">
											Review in {{ daysUntil(card.nextReview) }} days
										</small>
									</div>
									<div class="d-flex align-items-center">
										<span 
											class="badge review-badge me-3" 
											:class="getBadgeClass(card.nextReview)"
										>
											{{ formatDate(card.nextReview) }}
										</span>
										<button 
											class="btn btn-danger" 
											@click="deleteCard(card.id)"
										>
											<i class="fas fa-trash"></i> Delete
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

		<!-- Exam Date Modal -->
		<div 
			class="modal" 
			:class="{show: showExamDateModal}" 
			:style="{display: showExamDateModal ? 'block' : 'none'}"
		>
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Set Exam Date</h5>
						<button 
							type="button" 
							class="btn-close" 
							@click="showExamDateModal = false"
						></button>
					</div>
					<div class="modal-body">
						<label class="form-label">Exam Date:</label>
						<input 
							type="date" 
							class="form-control" 
							v-model="examDate"
						>
					</div>
					<div class="modal-footer">
						<button 
							type="button" 
							class="btn btn-secondary" 
							@click="showExamDateModal = false"
						>
							Cancel
						</button>
						<button 
							type="button" 
							class="btn btn-primary" 
							@click="saveExamDate"
						>
							Save Exam Date
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'StudyApp',
	data() {
		return {
			// Topics Management
			topics: [],
			topicIdCounter: 1,
			newTopic: {
				module: '',
				name: ''
			},
			customModuleName: '',
			modules: [
				'Mathematics',
				'Physics',
				'Chemistry',
				'Biology',
				'Computer Science',
				'History',
				'Literature',
				'Economics',
				'Psychology',
				'Engineering'
			],
			
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
			
			// Flashcards
			flashcards: [],
			newCard: { question: '', answer: '' },
			showAddCard: false,
			reviewMode: false,
			currentCardIndex: 0,
			cardIdCounter: 1,
			showExamDateModal: false,
			examDate: ''
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
		currentCard() {
			return this.dueCards[this.currentCardIndex] || null;
		},
		reviewProgress() {
			if (this.dueCards.length === 0) return 0;
			return ((this.currentCardIndex + 1) / this.dueCards.length) * 100;
		}
	},
	methods: {
		// Topics methods
		addTopic() {
			if (!this.newTopic.name.trim()) {
				alert('Please enter a topic name');
				return;
			}
			
			let moduleName = this.newTopic.module;
			
			if (this.newTopic.module === 'custom') {
				if (!this.customModuleName.trim()) {
					alert('Please enter a custom module name');
					return;
				}
				moduleName = this.customModuleName;
				// Add custom module to the list if it's not already there
				if (!this.modules.includes(moduleName)) {
					this.modules.splice(this.modules.length, 0, moduleName);
				}
			} else if (!moduleName) {
				alert('Please select a module');
				return;
			}
			
			const topic = {
				id: this.topicIdCounter++,
				module: moduleName,
				name: this.newTopic.name,
				completed: false,
				addedDate: new Date().toISOString()
			};
			
			this.topics.push(topic);
			this.newTopic = { module: '', name: '' };
			this.customModuleName = '';
			this.saveTopics();
		},
		deleteTopic(id, topicName) {
			if (confirm(`Are you sure you want to delete the topic "${topicName}"? This action cannot be undone.`)) {
				this.topics = this.topics.filter(t => t.id !== id);
				this.saveTopics();
			}
		},
		clearAllTopics() {
			if (confirm('Are you sure you want to clear all topics? This cannot be undone.')) {
				this.topics = [];
				this.topicIdCounter = 1;
				this.saveTopics();
			}
		},
		formatTopicDate(dateStr) {
			const date = new Date(dateStr);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		},
		saveTopics() {
			const data = {
				topics: this.topics,
				topicIdCounter: this.topicIdCounter,
				customModules: this.modules.filter(m => 
					!['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 
					 'History', 'Literature', 'Economics', 'Psychology', 'Engineering'].includes(m)
				)
			};
			localStorage.setItem('studyTopicsData', JSON.stringify(data));
		},
		loadTopics() {
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
				alert('Please enter valid times');
				return;
			}
			this.studyTime = this.customStudy;
			this.breakTime = this.customBreak;
			this.resetTimer();
		},
		startTimer() {
			this.isRunning = true;
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
		},
		resetTimer() {
			this.pauseTimer();
			this.minutes = this.isBreak ? this.breakTime : this.studyTime;
			this.seconds = 0;
		},
		timerComplete() {
			this.pauseTimer();
			this.isBreak = !this.isBreak;
			this.minutes = this.isBreak ? this.breakTime : this.studyTime;
			this.seconds = 0;
			
			const message = this.isBreak ? 
				'Great work! Time for a break ☕' : 
				'Break is over! Ready to study? 📚';
			alert(message);
		},
		
		// Flashcard methods
		addFlashcard() {
			if (!this.newCard.question || !this.newCard.answer) {
				alert('Please fill in both question and answer');
				return;
			}
			
			const card = {
				id: this.cardIdCounter++,
				question: this.newCard.question,
				answer: this.newCard.answer,
				nextReview: new Date().toISOString().split('T')[0],
				interval: 1,
				flipped: false
			};
			
			this.flashcards.push(card);
			this.newCard = { question: '', answer: '' };
			this.showAddCard = false;
			this.saveData();
		},
		flipCard(card) {
			card.flipped = !card.flipped;
		},
		startReview() {
			this.reviewMode = true;
			this.currentCardIndex = 0;
			// Reset all flipped states
			this.dueCards.forEach(card => card.flipped = false);
		},
		flipCurrentCard() {
			if (this.currentCard) {
				this.currentCard.flipped = !this.currentCard.flipped;
			}
		},
		rateCurrentCard(difficulty) {
			this.rateCard(this.currentCard, difficulty);
			
			// Move to next card or end review
			if (this.currentCardIndex < this.dueCards.length - 1) {
				this.currentCardIndex++;
			} else {
				alert('Review session complete! Great job! 🎉');
				this.endReview();
			}
		},
		endReview() {
			this.reviewMode = false;
			this.currentCardIndex = 0;
			this.dueCards.forEach(card => card.flipped = false);
		},
		rateCard(card, difficulty) {
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
			this.saveData();
		},
		deleteCard(id) {
			if (confirm('Delete this flashcard?')) {
				this.flashcards = this.flashcards.filter(c => c.id !== id);
				this.saveData();
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
		saveExamDate() {
			this.showExamDateModal = false;
			this.saveData();
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
		clearAllFlashcards() {
			if (confirm('Are you sure you want to delete ALL flashcards? This cannot be undone.')) {
				this.flashcards = [];
				this.cardIdCounter = 1;
				this.reviewMode = false;
				this.currentCardIndex = 0;
				this.saveData();
				alert('All flashcards have been cleared.');
			}
		}

	},
	mounted() {
		this.loadData();
		this.loadTopics();
		
		// Initialize Bootstrap tooltips
		this.$nextTick(() => {
			const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
			[...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
		});
	},
	beforeUnmount() {
		// Clean up timer interval
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
	}
};
</script>

<style scoped>
.study-app {
	background: white;
	min-height: 100vh;
	font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.main-container {
	padding: 2rem 0;
}

.card {
	border-radius: 15px;
	box-shadow: 0 10px 30px rgba(0,0,0,0.2);
	margin-bottom: 2rem;
	overflow: visible;
	position: relative;
}

.card-header {
	background: #667eea;
	color: white;
	border-radius: 15px 15px 0 0 !important;
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

.module-group {
	background: #f8f9fa;
	padding: 1rem;
	border-radius: 10px;
}

.module-header {
	color: #667eea;
	font-weight: 600;
	margin-bottom: 1rem;
	padding-bottom: 0.5rem;
	border-bottom: 2px solid #dee2e6;
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
	box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
	box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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
	transition: transform 0.3s;
	box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.flashcard:hover {
	transform: scale(1.02);
}

.flashcard-content {
	font-size: 1.5rem;
	color: #333;
	min-height: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
}

.review-badge {
	font-size: 0.9rem;
	padding: 0.5rem 1rem;
	border-radius: 20px;
}

.modal.show {
	display: block;
	background-color: rgba(0, 0, 0, 0.5);
}

.modal-backdrop.show {
	opacity: 0.5;
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

.front-icon{
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
	top: calc(100% + 10px);
	right: -10px;
	background: white;
	border: 2px solid #667eea;
	border-radius: 15px;
	padding: 20px;
	width: 450px;
	max-width: calc(100vw - 40px);
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	animation: fadeIn 0.3s;
}

@media (max-width: 768px) {
	.help-tooltip-header {
		right: auto;
		left: 50%;
		transform: translateX(-50%);
		width: 90vw;
	}
}

.help-tooltip-header::before {
	content: '';
	position: absolute;
	top: -10px;
	right: 20px;
	width: 0;
	height: 0;
	border-left: 10px solid transparent;
	border-right: 10px solid transparent;
	border-bottom: 10px solid #667eea;
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
</style>