<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter();
const route = useRoute();

const siEmail = ref('');
const siPassword = ref('');
const siLoading = ref(false);
const siError = ref(null);

const suEmail = ref('');
const suPassword = ref('');
const suConfirm = ref('');
const suLoading = ref(false);
const suError = ref(null);

const mode = ref('signin');

const checkSignIn = computed(() =>
    siEmail.value && siPassword.value
);

const checkSignUp = computed(() =>
    suEmail.value && suPassword.value && suPassword.value === suConfirm.value
);

function switchMode(login) {
    mode.value = login;
    if (login === 'signin') {
        siError.value = null;
    } else {
        suError.value = null;
    }
}

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
    <div class="container py-4">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-6">
                <div class="btn-group w-100 mb-3">
                    <button type="button" class="btn" :class="mode === 'signin' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="switchMode('signin')">
                        Sign in
                    </button>
                    <button type="button" class="btn" :class="mode === 'signup' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="switchMode('signup')">
                        Create account
                    </button>
                </div>

                <div v-if="mode === 'signin'" class="card auth-card">
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
                </div>

                <div v-else class="card auth-card">
                    <div class="card-body p-4 d-flex flex-column">
                        <h2 class="mb-1">Create your account</h2>
                        <p class="text-muted mb-3">Sign up with your email to get started</p>

                        <form @submit.prevent="onSignUp()" novalidate>
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
    </div>
</template>

<style scoped>
/* Auth card */
.auth-card {
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Auth card hover */
.auth-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}
</style>