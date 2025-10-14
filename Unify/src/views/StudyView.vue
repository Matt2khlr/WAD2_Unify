<template>
	<div class="study-app">
		<div class="container main-container">
			<h1 class="text-center text-black mb-4">
				<i class="fas fa-graduation-cap"></i> Study Tools
			</h1>

			<!-- Pomodoro Timer Section -->
			<div class="card">
				<div class="card-header">
					<i class="fas fa-clock"></i> Pomodoro Timer
					<i 
						class="fas fa-question-circle help-icon" 
						data-bs-toggle="tooltip" 
						data-bs-placement="right"
						title="The Pomodoro Technique breaks study time into focused intervals (typically 25 minutes) followed by short breaks. This helps maintain concentration, prevent burnout, and improve productivity by working with your brain's natural attention span."
					></i>
				</div>
				<div class="card-body text-center">
					<!-- Preset Timers -->
					<div class="mb-4">
						<h5>Quick Select:</h5>
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
			<div class="card">
				<div class="card-header">
					<i class="fas fa-brain"></i> Spaced Repetition Flashcards
					<i 
						class="fas fa-question-circle help-icon" 
						data-bs-toggle="tooltip" 
						data-bs-placement="right"
						title="Spaced Repetition optimizes learning by scheduling reviews at increasing intervals. You review cards right before you'd forget them, strengthening long-term memory. Cards you find easy are shown less often, while difficult cards appear more frequently."
					></i>
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
									<div>
										<strong>{{ card.question }}</strong>
										<br>
										<small class="text-muted">
											Review in {{ daysUntil(card.nextReview) }} days
										</small>
									</div>
									<span 
										class="badge review-badge" 
										:class="getBadgeClass(card.nextReview)"
									>
										{{ formatDate(card.nextReview) }}
									</span>
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
						<input type="date" class="form-control" v-model="examDate">
						<p class="text-muted mt-2">
							Cards will not be scheduled for review after this date.
						</p>
					</div>
					<div class="modal-footer">
						<button 
							type="button" 
							class="btn btn-secondary" 
							@click="showExamDateModal = false"
						>
							Close
						</button>
						<button 
							type="button" 
							class="btn btn-primary" 
							@click="saveExamDate"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
		<div 
			class="modal-backdrop" 
			:class="{show: showExamDateModal}" 
			:style="{display: showExamDateModal ? 'block' : 'none'}"
		></div>
	</div>
</template>

<script>
export default {
	name: 'StudyTools',
	data() {
		return {
			// Timer data
			minutes: 25,
			seconds: 0,
			isRunning: false,
			isBreak: false,
			timerInterval: null,
			selectedPreset: 'pomodoro',
			studyTime: 25,
			breakTime: 5,
			customStudy: 25,
			customBreak: 5,
			
			// Flashcard data
			flashcards: [],
			showAddCard: false,
			newCard: {
				question: '',
				answer: ''
			},
			examDate: '',
			showExamDateModal: false,
			cardIdCounter: 1,
			reviewMode: false,
			currentCardIndex: 0
		};
	},
	computed: {
		formattedTime() {
			const m = String(this.minutes).padStart(2, '0');
			const s = String(this.seconds).padStart(2, '0');
			return `${m}:${s}`;
		},
		dueCards() {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return this.flashcards.filter(card => {
				const reviewDate = new Date(card.nextReview);
				reviewDate.setHours(0, 0, 0, 0);
				return reviewDate <= today;
			});
		},
		upcomingCards() {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return this.flashcards.filter(card => {
				const reviewDate = new Date(card.nextReview);
				reviewDate.setHours(0, 0, 0, 0);
				return reviewDate > today;
			}).sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
		},
		currentCard() {
			if (this.reviewMode && this.dueCards.length > 0) {
				return this.dueCards[this.currentCardIndex];
			}
			return null;
		},
		reviewProgress() {
			if (this.dueCards.length === 0) return 0;
			return ((this.currentCardIndex + 1) / this.dueCards.length) * 100;
		}
	},
	methods: {
		// Timer methods
		setPreset(preset) {
			this.selectedPreset = preset;
			if (preset === 'pomodoro') {
				this.studyTime = 25;
				this.breakTime = 5;
			} else if (preset === 'short') {
				this.studyTime = 15;
				this.breakTime = 3;
			} else if (preset === 'long') {
				this.studyTime = 50;
				this.breakTime = 10;
			}
			this.resetTimer();
		},
		setCustomTimer() {
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
		}
	},
	mounted() {
		this.loadData();
		
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
}

.card-header {
	background: #667eea;
	color: white;
	border-radius: 15px 15px 0 0 !important;
	padding: 1.5rem;
	font-weight: 600;
	font-size: 1.3rem;
}

.help-icon {
	cursor: help;
	color: #ffd700;
	margin-left: 0.5rem;
	transition: transform 0.2s;
}

.help-icon:hover {
	transform: scale(1.2);
}

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
</style>