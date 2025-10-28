<script setup>
import { ref, onMounted } from 'vue';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);

// Change password state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordLoading = ref(false);
const passwordError = ref(null);
const passwordSuccess = ref(false);

// Logout state
const logoutLoading = ref(false);

// Load current user on mount
onMounted(() => {
    user.value = auth.currentUser;
});

// Update password
async function updatePasswordHandler() {
    if (!currentPassword.value) {
        passwordError.value = 'Current password is required.';
        return;
    }

    if (!newPassword.value || newPassword.value.length < 6) {
        passwordError.value = 'New password must be at least 6 characters.';
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        passwordError.value = 'Passwords do not match.';
        return;
    }

    passwordLoading.value = true;
    passwordError.value = null;
    passwordSuccess.value = false;

    try {
        const credential = EmailAuthProvider.credential(user.value.email, currentPassword.value);
        await reauthenticateWithCredential(user.value, credential);
        await updatePassword(user.value, newPassword.value);
        passwordSuccess.value = true;
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        setTimeout(() => passwordSuccess.value = false, 3000);
    } catch (e) {
        const code = e?.code || '';
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            passwordError.value = 'Current password is incorrect.';
        } else if (code === 'auth/weak-password') {
            passwordError.value = 'Your password should be at least 6 characters.';
        } else {
            passwordError.value = e?.message || 'Failed to update password.';
        }
    } finally {
        passwordLoading.value = false;
    }
}

// Logout handler
async function logout() {
    logoutLoading.value = true;
    try {
        await signOut(auth);
        router.push('/login');
    } catch (e) {
        console.error('Logout failed:', e);
    } finally {
        logoutLoading.value = false;
    }
}
</script>

<template>
    <div class="container py-4">
        <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-6">
                <h1 class="mb-4">Settings</h1>

                <!-- Account Information Section -->
                <div class="card auth-card mb-4">
                    <div class="card-body p-4">
                        <h2 class="h5 mb-3">Account Information</h2>
                        <div class="mb-0">
                            <label class="form-label text-muted small">Email</label>
                            <div class="fw-semibold">{{ user?.email }}</div>
                        </div>
                    </div>
                </div>

                <!-- Change Password Section -->
                <div class="card auth-card mb-4">
                    <div class="card-body p-4 d-flex flex-column">
                        <h2 class="mb-1">Change Password</h2>
                        <p class="text-muted mb-3">Update your account password</p>

                        <form @submit.prevent="updatePasswordHandler()">
                            <div class="mb-3">
                                <label for="current-password" class="form-label">Current Password</label>
                                <input id="current-password" v-model="currentPassword" type="password"
                                    class="form-control" placeholder="Enter your current password"
                                    autocomplete="current-password" required />
                            </div>
                            <div class="mb-3">
                                <label for="new-password" class="form-label">New Password</label>
                                <input id="new-password" v-model="newPassword" type="password" class="form-control"
                                    placeholder="Enter your new password" autocomplete="new-password" minlength="6"
                                    required />
                                <div class="form-text">Password must be at least 6 characters long.</div>
                            </div>
                            <div class="mb-3">
                                <label for="confirm-password" class="form-label">Confirm password</label>
                                <input id="confirm-password" v-model="confirmPassword" type="password"
                                    class="form-control" placeholder="Confirm your new password"
                                    autocomplete="new-password" required />
                            </div>
                            <button type="submit" class="btn btn-primary w-100" :disabled="passwordLoading">
                                <span v-if="passwordLoading" class="spinner-border spinner-border-sm me-2"></span>
                                Update Password
                            </button>
                        </form>

                        <div v-if="passwordSuccess" class="alert alert-success mt-3 mb-0">
                            Password updated successfully!
                        </div>
                        <div v-if="passwordError" class="alert alert-danger mt-3 mb-0">
                            {{ passwordError }}
                        </div>
                    </div>
                </div>

                <!-- Logout Section -->
                <div class="card auth-card">
                    <div class="card-body p-4 d-flex flex-column">
                        <button class="btn btn-outline-danger w-100" @click="logout" :disabled="logoutLoading">
                            <span v-if="logoutLoading" class="spinner-border spinner-border-sm me-2"></span>
                            Logout
                        </button>
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