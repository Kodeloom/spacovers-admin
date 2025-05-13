<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set Initial Admin Password
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Set the password for the initial administrator account.
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleSetup">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Admin Email Address"
              readonly
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="New Password"
            />
          </div>
          <div>
            <label for="confirm-password" class="sr-only">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              name="confirm-password"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Confirm New Password"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="text-red-500 text-sm text-center">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="text-green-500 text-sm text-center">
          {{ successMessage }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <!-- Loading indicator can go here -->
            </span>
            {{ loading ? 'Processing...' : 'Set Admin Password' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Pre-fill with the seeded admin email
const email = ref('admin@example.com'); 
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

const handleSetup = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  if (password.value.length < 8) { // Basic length check, align with Better-Auth config if needed
    errorMessage.value = 'Password must be at least 8 characters long.';
    return;
  }

  loading.value = true;

  try {
    // TODO: Replace with actual API call to the server endpoint
    console.log('Submitting setup for:', email.value);
    console.log('Password length:', password.value.length);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Call our server endpoint
    const response = await $fetch('/api/admin-setup/set-password', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    });

    // Assuming the API returns a success message or throws an error
    successMessage.value = 'Admin password set successfully! You can now log in.'; 
    // Optionally redirect or disable the form after success
    password.value = ''; // Clear fields on success
    confirmPassword.value = '';

  } catch (error: any) {
    console.error('Admin setup error:', error);
    errorMessage.value = error.data?.message || 'An error occurred during setup.';
  } finally {
    loading.value = false;
  }
};
</script> 