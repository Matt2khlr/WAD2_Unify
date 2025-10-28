<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter();
const route = useRoute();

// Sign in state
const siEmail = ref('');
const siPassword = ref('');
const siLoading = ref(false);
const siError = ref(null);

// Sign up state
const suEmail = ref('');
const suPassword = ref('');
const suConfirm = ref('');
const suLoading = ref(false);
const suError = ref(null);

// Login mode
const mode = ref('signin');

// Check inputs for sign in
const checkSignIn = computed(() =>
    siEmail.value && siPassword.value
);

// Check inputs for sign up
const checkSignUp = computed(() =>
    suEmail.value && suPassword.value && suPassword.value === suConfirm.value
);

// Switch between sign in and sign up modes
function switchMode(login) {
    mode.value = login;
    if (login === 'signin') {
        siError.value = null;
    } else {
        suError.value = null;
    }
}

// Sign in validation
async function onSignIn() {
    if (!checkSignIn.value) {
        siError.value = 'Please enter your email and password.';
        return;
    }
    siLoading.value = true;
    siError.value = null;

    try {
        await signInWithEmailAndPassword(auth, siEmail.value, siPassword.value);
        router.push(route.query.redirect || '/');
    } catch (e) {
        const code = e?.code || '';
        if (code === 'auth/invalid-email' || code === 'auth/invalid-password' || code === 'auth/invalid-credential') {
            siError.value = 'Incorrect email or password.';
        } else {
            siError.value = 'Sign-in failed.';
        }
    } finally {
        siLoading.value = false;
    }
}

// Sign up validation
async function onSignUp() {
    if (!checkSignUp.value) {
        suError.value = 'Please enter a valid email and matching passwords.';
        return;
    }
    suLoading.value = true;
    suError.value = null;

    try {
        await createUserWithEmailAndPassword(auth, suEmail.value, suPassword.value);
        router.push(route.query.redirect || '/');
    } catch (e) {
        const code = e?.code || '';
        if (code === 'auth/email-already-in-use') {
            suError.value = 'This email is already registered.';
        } else if (code === 'auth/invalid-email') {
            suError.value = 'Please enter a valid email address.';
        } else if (code === 'auth/weak-password') {
            suError.value = 'Your password should be at least 6 characters.';
        } else {
            suError.value = 'Registration failed.';
        }
    } finally {
        suLoading.value = false;
    }
}
</script>

<template>
    <!-- <div class="container py-4">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-6"> -->
                <!-- Switch between sign in and sign up modes -->
                <!-- <div class="btn-group w-100 mb-3">
                    <button type="button" class="btn" :class="mode === 'signin' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="switchMode('signin')">
                        Sign in
                    </button>
                    <button type="button" class="btn" :class="mode === 'signup' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="switchMode('signup')">
                        Create account
                    </button>
                </div> -->

                <!-- Sign in form -->
                <!-- <div v-if="mode === 'signin'" class="card auth-card">
                    <div class="card-body p-4 d-flex flex-column">
                        <h2 class="mb-1">Welcome back!</h2>
                        <p class="text-muted mb-3">Sign in with your email to continue</p>

                        <form @submit.prevent="onSignIn()">
                            <div class="mb-3">
                                <label for="si-email" class="form-label">Email</label>
                                <input id="si-email" v-model="siEmail" type="email" class="form-control"
                                    autocomplete="email" required />
                            </div>
                            <div class="mb-3">
                                <label for="si-password" class="form-label">Password</label>
                                <input id="si-password" v-model="siPassword" type="password" class="form-control"
                                    autocomplete="current-password" required />
                            </div>
                            <button type="submit" class="btn btn-primary w-100" :disabled="!checkSignIn || siLoading">
                                <span v-if="siLoading" class="spinner-border spinner-border-sm me-2"></span>
                                Sign in
                            </button>
                        </form>

                        <div v-if="siError" class="alert alert-danger mt-3">
                            {{ siError }}
                        </div>
                    </div>
                </div> -->

                <!-- Sign up form -->
                <!-- <div v-else class="card auth-card">
                    <div class="card-body p-4 d-flex flex-column">
                        <h2 class="mb-1">Create your account</h2>
                        <p class="text-muted mb-3">Sign up with your email to get started</p>

                        <form @submit.prevent="onSignUp()">
                            <div class="mb-3">
                                <label for="su-email" class="form-label">Email</label>
                                <input id="su-email" v-model="suEmail" type="email" class="form-control"
                                    autocomplete="email" required />
                            </div>
                            <div class="mb-3">
                                <label for="su-password" class="form-label">Password</label>
                                <input id="su-password" v-model="suPassword" type="password" class="form-control"
                                    autocomplete="new-password" minlength="6" required />
                                <div class="form-text">Password must be at least 6 characters long.</div>
                            </div>
                            <div class="mb-3">
                                <label for="su-confirm" class="form-label">Confirm password</label>
                                <input id="su-confirm" v-model="suConfirm" type="password" class="form-control"
                                    autocomplete="new-password" required />
                            </div>
                            <button type="submit" class="btn btn-primary w-100" :disabled="!checkSignUp || suLoading">
                                <span v-if="suLoading" class="spinner-border spinner-border-sm me-2"></span>
                                Create account
                            </button>
                        </form>

                        <div v-if="suError" class="alert alert-danger mt-3">
                            {{ suError }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div> -->

    <div class="auth-container">
        <div class="auth-content">
            <!-- iOS-style Toggle -->
            <div class="auth-toggle-container">
                <div class="auth-toggle">
                    <input 
                        type="checkbox" 
                        id="authToggle" 
                        :checked="mode === 'signup'"
                        @change="switchMode(mode === 'signin' ? 'signup' : 'signin')"
                    >
                    <label for="authToggle">
                        <span class="toggle-option">Sign In</span>
                        <span class="toggle-option">Sign Up</span>
                    </label>
                </div>
            </div>

            <!-- Auth Card -->
            <div class="auth-card">
            <!-- Sign in form -->
            <div v-if="mode === 'signin'" class="auth-form">
                <div class="auth-header">
                <!-- Logo -->
                <div class="auth-logo">
                    <img src="../assets/logo-gradient.png" alt="Logo" />
                </div>
                
                <h2 class="auth-title">Welcome Back!</h2>
                <p class="auth-subtitle">We missed you...</p>
                </div>

                <form @submit.prevent="onSignIn()">
                <div class="form-group">
                    <label for="si-email" class="form-label">Email</label>
                    <input 
                    id="si-email" 
                    v-model="siEmail" 
                    type="email" 
                    class="form-input"
                    placeholder="your@email.com"
                    autocomplete="email" 
                    required 
                    />
                </div>
                
                <div class="form-group">
                    <label for="si-password" class="form-label">Password</label>
                    <input 
                    id="si-password" 
                    v-model="siPassword" 
                    type="password" 
                    class="form-input"
                    placeholder="Enter your password"
                    autocomplete="current-password" 
                    required 
                    />
                </div>
                
                <button 
                    type="submit" 
                    class="btn-submit" 
                    :disabled="!checkSignIn || siLoading"
                >
                    <span v-if="siLoading" class="spinner"></span>
                    <span v-else>Sign in</span>
                </button>
                </form>

                <div v-if="siError" class="alert-error">
                <i class="mdi mdi-alert-circle"></i>
                {{ siError }}
                </div>
            </div>

            <!-- Sign up form -->
            <div v-else class="auth-form">
                <div class="auth-header">
                <!-- Logo -->
                <div class="auth-logo">
                    <img src="../assets/logo-gradient.png" alt="Logo" />
                </div>
                
                <h2 class="auth-title">Create an Account</h2>
                <p class="auth-subtitle">Your wellbeing journey starts here!</p>
                </div>

                <form @submit.prevent="onSignUp()">
                <div class="form-group">
                    <label for="su-email" class="form-label">Email</label>
                    <input 
                    id="su-email" 
                    v-model="suEmail" 
                    type="email" 
                    class="form-input"
                    placeholder="your@email.com"
                    autocomplete="email" 
                    required 
                    />
                </div>
                
                <div class="form-group">
                    <label for="su-password" class="form-label">Password</label>
                    <input 
                    id="su-password" 
                    v-model="suPassword" 
                    type="password" 
                    class="form-input"
                    placeholder="At least 6 characters"
                    autocomplete="new-password" 
                    minlength="6" 
                    required 
                    />
                </div>
                
                <div class="form-group">
                    <label for="su-confirm" class="form-label">Confirm Password</label>
                    <input 
                    id="su-confirm" 
                    v-model="suConfirm" 
                    type="password" 
                    class="form-input"
                    placeholder="Re-enter your password"
                    autocomplete="new-password" 
                    required 
                    />
                </div>
                
                <button 
                    type="submit" 
                    class="btn-submit" 
                    :disabled="!checkSignUp || suLoading"
                >
                    <span v-if="suLoading" class="spinner"></span>
                    <span v-else>Create account</span>
                </button>
                </form>

                <div v-if="suError" class="alert-error">
                <i class="mdi mdi-alert-circle"></i>
                {{ suError }}
                </div>
            </div>
            </div>
        </div>
    </div>

</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: auto;
}
</style>

<style scoped>
/* Auth card */
/* .auth-card {
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
} */

/* Auth card hover */
/* .auth-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
} */

/* Container with gradient background */
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

/* Content wrapper */
.auth-content {
  width: 100%;
  max-width: 450px;
}

/* iOS-style Toggle Container */
.auth-toggle-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.auth-toggle {
  position: relative;
  width: 280px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  padding: 4px;
  backdrop-filter: blur(10px);
}

.auth-toggle input {
  display: none;
}

.auth-toggle label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  position: relative;
  cursor: pointer;
  margin: 0;
}

.toggle-option {
  flex: 1;
  text-align: center;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  z-index: 1;
  transition: color 0.3s ease;
}

.auth-toggle label::before {
  content: '';
  position: absolute;
  width: 50%;
  height: calc(100% - 8px);
  background: white;
  border-radius: 22px;
  left: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.auth-toggle input:checked ~ label::before {
  left: calc(50% - 4px);
}

.auth-toggle input:not(:checked) ~ label .toggle-option:first-child {
  color: #667eea;
}

.auth-toggle input:checked ~ label .toggle-option:last-child {
  color: #667eea;
}

/* Auth Card */
.auth-card {
  background: white;
  border-radius: 20px;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

/* Auth Header */
.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
}

/* Logo Styling */
.auth-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
}

.auth-logo img {
  width: 200px;
  height: 80px;
  object-fit: contain;
}

/* Form Styling */
.auth-form {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: #f9fafb;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

/* Submit Button */
.btn-submit {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(0);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error Alert */
.alert-error {
  margin-top: 1.5rem;
  padding: 0.875rem 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert-error i {
  font-size: 1.25rem;
}

/* Responsive */
@media (max-width: 576px) {
  .auth-card {
    padding: 2rem 1.5rem;
  }

  .auth-title {
    font-size: 1.5rem;
  }

  .auth-toggle {
    width: 100%;
  }
}


</style>