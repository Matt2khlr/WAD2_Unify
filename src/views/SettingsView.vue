<script setup>
import { ref, onMounted } from 'vue';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '@/firebase';
import { useRouter } from 'vue-router';
import { performLogout } from '@/utils/auth';

const router = useRouter();

// User data
const user = ref(null);

// Toast notification
const toast = ref(null);
const toastMessage = ref('');

// Username state
const userName = ref('');
const userNameLoading = ref(false);
const isEditingName = ref(false);

// Password state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordLoading = ref(false);
const passwordSuccess = ref(false);

// Logout state
const logoutLoading = ref(false);

// Load current user on mount
onMounted(() => {
  user.value = auth.currentUser;
  userName.value = auth.currentUser?.displayName || '';
});

// Update username
async function updateUserName() {
  const uName = userName.value.trim();

  if (!uName) {
    showToast('Username cannot be empty.');
    return;
  }

  if (uName === user.value.displayName) {
    isEditingName.value = false;
    return;
  }

  userNameLoading.value = true;
  isEditingName.value = true;

  try {
    await updateProfile(user.value, {
      displayName: uName
    });
    await auth.currentUser.reload();
    user.value = auth.currentUser;

    window.dispatchEvent(new CustomEvent('profile-updated'));
    showToast('Username updated successfully.');
    isEditingName.value = false;
  } catch (e) {
    showToast(e?.message || 'Failed to update username.');
  } finally {
    userNameLoading.value = false;
  }
}

// Cancel edit
function cancelEditName() {
  userName.value = user.value?.displayName || '';
  isEditingName.value = false;
}

// Update password
async function updateUserPassword() {
  const validationError = validatePasswordInputs();
  if (validationError) {
    showToast(validationError);
    return;
  }

  passwordLoading.value = true;

  try {
    const credential = EmailAuthProvider.credential(
      user.value.email,
      currentPassword.value
    );

    await reauthenticateWithCredential(user.value, credential);
    await updatePassword(user.value, newPassword.value);

    resetPasswordForm();
    showToast('Password updated successfully.');

    passwordSuccess.value = true;
    setTimeout(() => {
      passwordSuccess.value = false;
    }, 3000);
  } catch (error) {
    handlePasswordError(error);
  } finally {
    passwordLoading.value = false;
  }
}

// Validate password inputs
function validatePasswordInputs() {
  if (!currentPassword.value) {
    return 'Please enter your current password.';
  }

  if (!newPassword.value || newPassword.value.length < 6) {
    return 'New password must be at least 6 characters.';
  }

  if (newPassword.value !== confirmPassword.value) {
    return 'Passwords do not match.';
  }

  if (newPassword.value === currentPassword.value) {
    return 'New password cannot be the same as the current password.';
  }

  return null;
}

// Handle password update errors
function handlePasswordError(error) {
  const errorCode = error?.code || '';

  const errorMessages = {
    'auth/wrong-password': 'Current password is incorrect.',
    'auth/invalid-credential': 'Current password is incorrect.',
    'auth/weak-password': 'Your password should be at least 6 characters.'
  };

  const message = errorMessages[errorCode] || error?.message || 'Failed to update password.';
  showToast(message);
}

function resetPasswordForm() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
}

// Logout function
async function handleLogout() {
  logoutLoading.value = true;

  try {
    await performLogout(router);
  } catch (error) {
    showToast('Failed to logout. Please try again.');
    console.error('Logout failed:', error);
  } finally {
    logoutLoading.value = false;
  }
}

function showToast(message) {
  toastMessage.value = message;

  if (toast.value) {
    const bsToast = new bootstrap.Toast(toast.value);
    bsToast.show();
  }
}
</script>

<template>
  <div class="container py-4">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <h1 class="mb-4">Settings</h1>

        <!-- Account Information Section -->
        <div class="card mb-4">
          <div class="card-body p-4">
            <h5 class="mb-3">Account Information</h5>

            <!-- Username -->
            <div class="mb-3">
              <label class="form-label small">Username</label>

              <div v-if="!isEditingName" class="d-flex justify-content-between align-items-center">
                <div class="fw-semibold">{{ user?.displayName || 'Not set' }}</div>
                <button type="button" class="btn btn-sm general-btn" @click="isEditingName = true">
                  Edit
                </button>
              </div>
              <div v-else class="d-flex gap-2">
                <input v-model="userName" type="text" class="form-control form-control-sm"
                  placeholder="Enter your username" />
                <button type="button" class="btn btn-sm general-btn" @click="updateUserName"
                  :disabled="userNameLoading">
                  Save
                </button>
                <button type="button" class="btn btn-sm red-btn" @click="cancelEditName"
                  :disabled="userNameLoading">
                  Cancel
                </button>
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="form-label small">Email</label>
              <div class="fw-semibold">{{ user?.email }}</div>
            </div>
          </div>
        </div>

        <!-- Change Password Section -->
        <div class="card mb-4">
          <div class="card-body p-4">
            <h5 class="mb-1">Change Password</h5>
            <p class="mb-3">Update your account password</p>

            <form @submit.prevent="updateUserPassword">
              <!-- Current Password -->
              <div class="mb-3">
                <label for="current-password" class="form-label">Current Password</label>
                <input id="current-password" v-model="currentPassword" type="password" class="form-control"
                  placeholder="Enter your current password" autocomplete="current-password" required />
              </div>
              <!-- New Password -->
              <div class="mb-3">
                <label for="new-password" class="form-label">New Password</label>
                <input id="new-password" v-model="newPassword" type="password" class="form-control"
                  placeholder="Enter your new password" autocomplete="new-password" minlength="6" required />
                <div class="form-text">Password must be at least 6 characters long.</div>
              </div>
              <!-- Confirm Password -->
              <div class="mb-3">
                <label for="confirm-password" class="form-label">Confirm Password</label>
                <input id="confirm-password" v-model="confirmPassword" type="password" class="form-control"
                  placeholder="Confirm your new password" autocomplete="new-password" required />
              </div>
              <!-- Update Password Button -->
              <button type="submit" class="btn general-btn w-100" :disabled="passwordLoading">
                <span v-if="passwordLoading" class="spinner-border spinner-border-sm me-2"></span>
                Update Password
              </button>
            </form>
          </div>
        </div>

        <!-- Logout Section -->
        <div class="card">
          <div class="card-body p-4">
            <button class="btn red-btn w-100" :disabled="logoutLoading" @click="handleLogout">
              <span v-if="logoutLoading" class="spinner-border spinner-border-sm me-2"></span>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div ref="toast" class="toast position-fixed bottom-0 start-50 translate-middle-x m-3" role="alert"
    aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
    <div class="toast-body">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
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

.general-btn {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 5px 10px;
  color: white;
}

.general-btn:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #667eea;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.red-btn {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.red-btn:hover {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid #ff6b6b;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.toast {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
}
</style>