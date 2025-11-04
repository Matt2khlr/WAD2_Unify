<script setup>
import { ref, onMounted } from 'vue';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'vue-router';
import { performLogout } from '@/utils/auth';

const router = useRouter();
const user = ref(null);

// Display name state
const displayName = ref('');
const displayNameLoading = ref(false);
const displayNameError = ref(null);
const displayNameSuccess = ref(false);
const isEditingName = ref(false);

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
    displayName.value = auth.currentUser?.displayName || '';
});

// Update display name
async function updateDisplayNameHandler() {
    if (!displayName.value || displayName.value.trim().length === 0) {
        displayNameError.value = 'Display name cannot be empty.';
        return;
    }

    if (displayName.value === user.value.displayName) {
        isEditingName.value = false;
        return;
    }

    displayNameLoading.value = true;
    displayNameError.value = null;
    displayNameSuccess.value = false;

    try {
        await updateProfile(user.value, {
            displayName: displayName.value.trim()
        });
        user.value = auth.currentUser;
        await auth.currentUser.reload();
        window.dispatchEvent(new CustomEvent('profile-updated'));
        displayNameSuccess.value = true;
        isEditingName.value = false;
        setTimeout(() => displayNameSuccess.value = false, 3000);
    } catch (e) {
        displayNameError.value = e?.message || 'Failed to update display name.';
    } finally {
        displayNameLoading.value = false;
    }
}

// Cancel edit
function cancelEditName() {
    displayName.value = user.value?.displayName || '';
    isEditingName.value = false;
    displayNameError.value = null;
}


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
        await performLogout(router);
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
                <div class="card card mb-4">
                    <div class="card-body p-4">
                        <!-- Display Name -->
                        <h5 class="mb-2">Account Information</h5>
                        <div class="mb-2">
                            <label class="form-label small">Display Name</label>
                            <div v-if="!isEditingName" class="d-flex justify-content-between align-items-center">
                                <div class="fw-semibold">{{ user?.displayName || '' }}</div>
                                <button type="button" class="btn btn-sm btn-outline-primary"
                                    @click="isEditingName = true">
                                    Edit
                                </button>
                            </div>
                            <div v-else class="d-flex gap-2">
                                <input v-model="displayName" type="text" class="form-control form-control-sm"
                                    placeholder="Enter your display name" />
                                <button type="button" class="btn btn-sm btn-primary" @click="updateDisplayNameHandler"
                                    :disabled="displayNameLoading">
                                    Save
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelEditName"
                                    :disabled="displayNameLoading">
                                    Cancel
                                </button>
                            </div>
                            <div v-if="displayNameSuccess" class="alert alert-success mt-2 mb-0 py-2">
                                Display name updated successfully!
                            </div>
                            <div v-if="displayNameError" class="alert alert-danger mt-2 mb-0 py-2">
                                {{ displayNameError }}
                            </div>
                        </div>
                        <div class="mb-0">
                            <label class="form-label text-muted small">Email</label>
                            <div class="fw-semibold">{{ user?.email }}</div>
                        </div>
                    </div>
                </div>

                <!-- Change Password Section -->
                <div class="card mb-4">
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
                <div class="card">
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
/* Cards */
.card {
    border-radius: 0.75rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    background-color: #f5f5f5;
}

/* Card Hover Effect */
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.btn-sm, .btn-primary{
    background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 0.75rem;
    padding: 5px 10px;
    color: white;
}
</style>